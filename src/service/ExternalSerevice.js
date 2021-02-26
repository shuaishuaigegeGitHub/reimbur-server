import sequelize from "../model/index";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import { sign, deSign } from "@/util/crypto";
import { finishTask, getReimburDefine, agree } from "../service/ReimburService";
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
        throw new Error("请求时间异常");
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

    if (!paymentOrder) {
        throw new GlobalError(510, "缺少买量数据");
    }
    if (!userId) {
        throw new GlobalError(510, "缺少用户ID");
    }
    if (!approveUserName) {
        throw new GlobalError(510, "缺少上级用户名");
    }

    const now = dayjs();

    let detailList = [];
    let total_money = 0;
    // NOTE: 注意这里的科目ID写死了（报销款ID）
    const SUBJECT_ID = "20010102";

    for (let payment of body.paymentOrder) {
        let remark =
            payment.start_date +
            " ~ " +
            payment.end_date +
            " " +
            payment.company_name +
            "【买量】";

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
        total_money = NP.round(NP.plus(total_money, payment.receivable), 2);
    }

    if (!detailList.length) {
        // 没有买量账单数据
        throw new GlobalError(505, "缺少买量账单数据");
    }

    // 去OA查找用户数据
    let [user, approveUser] = await findUserById([
        { user_id: userId },
        { user_name: approveUserName },
    ]);

    // 因为OA返回的奇葩数据，所以要这么写。建议OA开发人员剁屌。
    user = user.data[0];
    approveUser = approveUser.data[0];

    if (!user) {
        throw new GlobalError(510, `找不到用户数据[${userId}]`);
    }
    if (!approveUser) {
        throw new GlobalError(510, `找不到用户数据[${approveUserName}]`);
    }

    const reimburDefine = await getReimburDefine();

    // 第一个审批操作是自己选上级进行操作
    reimburDefine[0].approveUser = approveUser.user_id;
    reimburDefine[0].approveUserName = approveUser.user_name;

    // 报销流程参数
    const reimburData = {
        applicant: user.user_id,
        applicant_name: user.user_name,
        applicant_dept: user.dept_id,
        applicant_dept_name: user.dept_name,
        date: now.format("YYYY-MM-DD"),
        create_id: user.user_id,
        create_by: user.user_name,
        create_dept_id: user.dept_id,
        create_dept_name: user.dept_name,
        apply_type: 2, // 预付请款
        pay_type: 1, // 银行转账
        reason: "买量预付请款",
        stage: reimburDefine[0].stage,
        payee: body.paymentOrder[0].company_name.replace(" ", ""),
        bank_name: body.paymentOrder[0].b_bank_deposit.replace(" ", ""),
        bank_account: body.paymentOrder[0].b_bank_number.replace(" ", ""),
        bank_address: body.paymentOrder[0].b_bank_address.replace(" ", ""),
        total_money: total_money,
        // 是否是买量报销
        payment: 1,
        update_by: user.user_name,
        updatetime: now.unix(),
        createtime: now.unix(),
    };

    let task = null;
    const transaction = await sequelize.transaction();
    try {
        const reimbur = await models.reimbur.create(reimburData, {
            transaction,
        });
        detailList.forEach((item) => {
            item.r_id = reimbur.id;
        });
        // 明细保存
        await models.reimbur_detail.bulkCreate(detailList, { transaction });
        // 创建审批任务
        task = await models.reimbur_task.create(
            {
                r_id: reimbur.id,
                stage: reimbur.stage,
                act_user_id: approveUser.user_id,
                act_user_name: approveUser.user_name,
                createtime: now.unix(),
                updatetime: now.unix(),
            },
            { transaction }
        );
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        global.logger.error("买量报销申请异常：%s", error.stack);
        throw new GlobalError(500, error.message);
    }
    // 直接完成部门领导审批
    if (task) {
        agree({
            task_id: task.id,
            remark: "",
            userid: approveUser.user_id,
            username: approveUser.user_name,
            updatetime: now.unix(),
        });
    }
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
            url:
                process.env.OA_SYSTEM_BASE_URL +
                "/admin/system_out/getUserById",
            method: "POST",
            headers: {
                systemtoken: token,
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
