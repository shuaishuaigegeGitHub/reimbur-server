import { WORKFLOW_TASK_STATUS_START } from "../workflow/WorkflowConstant";
import sequelize from "../model/index";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import { sign, deSign } from "@/util/crypto";
import { startBaoXiaoProcess, completeBaoXiaoProcess, finishTask } from "../service/ReimburService";
import NP from "number-precision";
import axios from "@/util/axios";

const { models } = sequelize;

/**
 * AES解密，并且校验时间
 * @param {string} signStr AES加密字符串
 */
function checkParams(signStr) {
    let body = deSign(signStr);
    let now = dayjs().unix();
    let requestTime = body.time;
    if (requestTime > now + 10 || requestTime < now - 10) {
        // 如果请求时间不在当前时间10秒左右则丢弃该请求
        throw new Error("请求时间不正常");
    }
    return body;
}

/**
 * 买量报销单生成
 */
export const paymentBaoXiaoGenerate = async (signStr = "") => {
    let body = checkParams(signStr);
    // 报销人ID
    let userId = body.userId;
    // 上级ID
    let approveUserName = body.approveUserName;
    // 买量数据
    let paymentOrder = body.paymentOrder;
    // 发票号
    let receiptNumber = body.receiptNumber;

    if (!receiptNumber) {
        throw new GlobalError(510, "缺少发票号");
    }
    if (!paymentOrder) {
        throw new GlobalError(510, "缺少买量数据");
    }
    if (!userId) {
        throw new GlobalError(510, "缺少用户ID");
    }
    if (!approveUserName) {
        throw new GlobalError(510, "缺少上级用户名");
    }

    const now = dayjs().format("YYYY-MM-DD");

    let detailList = [];
    let total_money = 0;
    // NOTE: 注意这里的科目ID写死了（报销款ID）
    const SUBJECT_ID = "20010102";

    for (let payment of body.paymentOrder) {
        let remark = payment.start_date + " ~ " + payment.end_date + " " + payment.company_name + "【买量】";

        detailList.push({
            money: payment.receivable,
            number: 1,
            unit: "笔",
            // 微信买量成本科目（详情看科目表）
            subject_id: SUBJECT_ID,
            name: "买量",
            remark: remark,
            payment_id: payment.id,
            start_date: payment.start_date,
            end_date: payment.end_date,
        });
        // 计算总报销金额
        total_money = NP.plus(total_money, payment.receivable);
    }

    if (!detailList.length) {
        // 没有买量账单数据
        throw new GlobalError(505, "缺少买量账单数据");
    }

    // 去OA查找用户数据
    let [user, approveUser] = await findUserById([{ user_id: userId }, { user_name: approveUserName }]);

    // 因为OA返回的奇葩数据，所以要这么写。建议OA开发人员剁屌。
    user = user.data[0];
    approveUser = approveUser.data[0];

    if (!user) {
        throw new GlobalError(510, `找不到用户数据[${userId}]`);
    }
    if (!approveUser) {
        throw new GlobalError(510, `找不到用户数据[${approveUserName}]`);
    }
    // 获取用户部门链表
    let userDept = user.dept_parent + "," + user.dept_name;
    userDept = userDept.split(",").slice(1).join("-");

    // 报销流程参数
    const flowParams = {
        a_user_id: user.user_id,
        a_user_name: user.user_name,
        a_dept_id: user.dept_id,
        a_dept_name: user.dept_name,
        a_date: now,
        b_user_id: user.user_id,
        b_user_name: user.user_name,
        b_dept_id: user.dept_id,
        b_dept_name: user.dept_name,
        b_date: now,
        apply_type: "预付请款",
        pay_type: "银行转账",
        approve_user: approveUser.user_id,
        approve_user_name: approveUser.user_name,
        receipt_number: receiptNumber,
        payee: body.paymentOrder[0].company_name.replace(" ", ""),
        bank_name: body.paymentOrder[0].b_bank_deposit.replace(" ", ""),
        bank_account: body.paymentOrder[0].b_bank_number.replace(" ", ""),
        bank_address: body.paymentOrder[0].b_bank_address.replace(" ", ""),
        total_money: total_money,
        // 是否是买量报销
        payment: true,
        detailList: detailList,
    };

    // 开启一个报销流程
    let workflowInstance = await startBaoXiaoProcess(flowParams, user.user_name);

    // 直接完成下一流程（上级审批流程）
    let task = await models.workflow_task.findOne({
        where: {
            wi_id: workflowInstance.id,
            status: WORKFLOW_TASK_STATUS_START,
        },
        raw: true,
    });

    let params = {
        id: task.id,
        user_id: approveUser.user_id,
        user_name: approveUser.user_name,
        updatetime: task.updatetime,
        remark: "同意",
    };

    await completeBaoXiaoProcess(params);
};

/**
 * 根据ID查找用户数据
 * @param {array} userList 用户数据ID或者用户名
 */
function findUserById(userList) {
    let listPromise = [];
    userList.forEach((user) => {
        let token = sign(user);
        let temp = axios({
            url: process.env.OA_SYSTEM_BASE_URL + "/admin/system_out/getUserById",
            method: "POST",
            headers: {
                systemToken: token,
            },
        });
        listPromise.push(temp);
    });
    return Promise.all(listPromise);
}

/**
 * 完成报销审核任务
 */
export const finishWorkflowTask = async (signStr = "") => {
    let body = checkParams(signStr);
    let refext = body.orderId;
    await finishTask(refext);
};
