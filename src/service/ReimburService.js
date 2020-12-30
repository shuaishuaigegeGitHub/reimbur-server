import WorkflowCtlFactory from "../workflow/WorkflowCtlFactory";
import {
    WORKFLOW_INSTANCE_STATUS_START,
    WORKFLOW_INSTANCE_STATUS_END,
    WORKFLOW_INSTANCE_STATUS_CANCEL,
    WORKFLOW_TASK_STATUS_START,
    WORKFLOW_TASK_STATUS_END,
    WORKFLOW_TASK_STATUS_CANCEL,
} from "../workflow/WorkflowConstant";
import nodeParser from "../workflow/parser/nodeParser";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import * as SystemService from "./SystemService";
import { sqlPage } from "../util/sqlPage";

const { models } = sequelize;

/**
 * 报销工作流引擎
 */
const baoXiaoWorkflowCtl = WorkflowCtlFactory.baoXiaoWorkflowCtl();
/**
 * 报销流程定义编码。与表 workflow 的 flow_key 相对应
 */
const BAOXIAO_KEY = "BAOXIAO";

/**
 * 查找可编辑的流程实例
 * @param {object} params
 */
export const queryEditable = async (params) => {
    const workflowInstance = await findEditableById(params);
    return {
        id: workflowInstance.id,
        status: workflowInstance.status,
        flow_params: JSON.parse(workflowInstance.flow_params),
        applicant: workflowInstance.applicant,
        updatetime: workflowInstance.updatetime,
    };
};

/**
 * 查找可编辑的流程实例
 * @param {object} params
 */
async function findEditableById(params) {
    const workflowInstance = await models.workflow_instance.findOne({
        attributes: ["id", "status", "flow_params", "applicant", "updatetime"],
        where: {
            id: params.id,
            status: WORKFLOW_INSTANCE_STATUS_START,
            flow_key: BAOXIAO_KEY,
            applicant: params.user_id,
        },
        raw: true,
    });
    if (!workflowInstance) {
        throw new GlobalError(
            505,
            "该报销流程已被审批，不可编辑，请刷新页面重试"
        );
    }
    let taskList = await models.workflow_task.findAll({
        attributes: ["id", "status"],
        where: {
            wi_id: params.id,
        },
        raw: true,
    });
    if (
        taskList.length !== 1 &&
        taskList[0].status !== WORKFLOW_TASK_STATUS_START
    ) {
        throw new GlobalError(
            505,
            "该报销流程已被审批，不可编辑，请刷新页面重试"
        );
    }
    return workflowInstance;
}

/**
 * 编辑流程实例
 * @param {object} params
 */
export const editProcess = async (params) => {
    await findEditableById(params);
    let res = await models.workflow_instance.update(
        {
            flow_params: JSON.stringify(params.flow_params),
            updatetime: dayjs().unix(),
        },
        {
            where: {
                id: params.id,
            },
        }
    );
    if (!res) {
        throw new GlobalError(501, "修改失败，请稍后重试");
    }
};

/**
 * 查询我的报销申请记录
 * @param {object} params
 */
export const queryMyBaoXiao = async (params = {}) => {
    let limit = params.size || 10;
    let page = params.page || 1;
    let offset = (page - 1) * limit;
    const where = {
        applicant: params.id,
        flow_key: BAOXIAO_KEY,
    };
    if (params.status && params.status > 0) {
        where.status = params.status;
    }
    if (params.applyTime) {
        let start = dayjs(params.applyTime[0], "YYYY-MM-DD").unix();
        let end = dayjs(params.applyTime[1], "YYYY-MM-DD").endOf("date").unix();
        where.createtime = {
            [Op.between]: [start, end],
        };
    }
    const data = await models.workflow_instance.findAndCountAll({
        attributes: [
            "id",
            "no",
            "cur_node_id",
            "next_node_id",
            "status",
            "flow_params",
            "applicant",
            "create_by",
            "createtime",
            "update_by",
            "updatetime",
        ],
        where,
        limit: limit,
        offset: offset,
        order: [["updatetime", "DESC"]],
        raw: true,
    });

    return {
        count: data.count,
        rows: data.rows.map((item) => {
            let temp = { ...item };
            temp.flow_params = JSON.parse(item.flow_params);
            temp.createtime = dayjs
                .unix(item.createtime)
                .format("YYYY-MM-DD HH:mm:ss");
            temp.updatetime = dayjs
                .unix(item.updatetime)
                .format("YYYY-MM-DD HH:mm:ss");
            return temp;
        }),
    };
};

/**
 * 查询我的审批
 * @param {object} params
 */
export const queryMyShenpi = async (params) => {
    let sql = `
        SELECT 
            t1.id AS task_id,
            t2.id,
            t1.node_id,
            t1.status,
            t2.refext,
            t2.flow_params,
            t2.createtime,
            t1.updatetime
        FROM
        workflow_task t1
        LEFT JOIN workflow_instance t2 ON t1.wi_id = t2.id
        WHERE t1.actor_user_id = ?
        AND t2.flow_key = ?
    `;

    const replacements = [params.id, BAOXIAO_KEY];

    if (params.status) {
        sql += " AND t1.status = ? ";
        replacements.push(params.status);
    }

    if (params.applyTime) {
        sql += " AND t2.createtime BETWEEN ? AND ? ";
        let start = dayjs(params.applyTime[0], "YYYY-MM-DD").unix();
        let end = dayjs(params.applyTime[1], "YYYY-MM-DD").endOf("date").unix();
        replacements.push(start);
        replacements.push(end);
    }

    sql += " ORDER BY t2.createtime DESC ";

    let page = params.page || 1;
    let size = params.size || 10;

    const data = await sqlPage(sql, replacements, { page, size });
    data.rows = data.rows.map((item) => {
        let temp = { ...item };
        temp.flow_params = JSON.parse(item.flow_params);
        temp.applicant = temp.flow_params.b_user_name;
        temp.createtime = dayjs
            .unix(temp.createtime)
            .format("YYYY-MM-DD HH:mm:ss");
        return temp;
    });

    return data;
};

/**
 * 查询我的待审批个数
 * @param {object} params
 */
export const queryMyShenpiCount = async (params) => {
    let count = await models.workflow_task.count({
        where: {
            actor_user_id: params.id,
            status: WORKFLOW_TASK_STATUS_START,
            params: "",
        },
    });
    return count;
};

/**
 * 查询流程实例走过的流程及状态
 */
export const queryInstanceProcessStatus = async (id) => {
    let instance = await models.workflow_instance.findByPk(id);
    if (!instance) {
        throw new GlobalError(500, "找不到对应的流程");
    }
    let taskAll = await models.workflow_task.findAll({
        where: {
            wi_id: id,
        },
        raw: true,
    });
    const params = JSON.parse(instance.flow_params);
    // 流程节点信息
    const nodeRoot = nodeParser(instance);
    const result = [
        {
            time: dayjs.unix(instance.createtime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: params.b_user_name,
            msg: "发起报销",
            color: "#409eff",
        },
    ];
    taskAll.forEach((task) => {
        let curNode = nodeRoot.getNodeModel(task.node_id);
        let actUser = curNode.approveUserName;
        if (!curNode.approveUser) {
            // 如果没有指定用户
            actUser = params.approve_user_name;
        }
        // 金额超过10W，并且是非主营业务成本的，需要换另外一个人。
        if (curNode.ext.money && params.total_money >= curNode.ext.money) {
            const exists = params.detailList.find(
                (item) => !item.subject_id.startsWith(curNode.ext.subject)
            );
            if (exists) {
                // 科目不是主营业务成本的就需要换人来审批
                actUser = curNode.ext.otherApproveUserName;
            }
        }
        let color = null;
        if (task.status === WORKFLOW_TASK_STATUS_END) {
            // 如果是完成状态，使用绿色标识
            color = "#67C23A";
        } else if (task.status === WORKFLOW_TASK_STATUS_CANCEL) {
            // 取消状态
            color = "#f55252";
        }
        let remark = null;
        if (task.params) {
            let taskParams = JSON.parse(task.params);
            remark = taskParams.remark;
        }
        // 转账
        let transfer = false;
        if (curNode.id === "stage-4" && instance.refext) {
            // 出纳转账阶段，并且已有银行流水号，说明已经转账了
            transfer = true;
        }
        result.push({
            time: dayjs.unix(task.updatetime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: actUser,
            msg: curNode.name,
            status: task.status,
            transfer,
            remark,
            color,
        });
    });
    if (instance.status === WORKFLOW_INSTANCE_STATUS_END) {
        // 如果该流程实例已经结束，则加上，结束节点。
        result.push({
            time: dayjs.unix(instance.updatetime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: params.b_user_name,
            msg: "流程结束",
            color: "#409eff",
        });
    }
    return result;
};

/**
 * 开启一个报销流程
 */
export const startBaoXiaoProcess = async (params, operator) => {
    validateParams(params);
    return await baoXiaoWorkflowCtl.startProcess(
        BAOXIAO_KEY,
        params,
        operator,
        params.b_user_id
    );
};

/**
 * 校验报销参数
 * @param {object} params 报销参数
 */
function validateParams(params) {
    if (!params) {
        throw new GlobalError(501, "缺少参数");
    }
    if (!params.a_user_id) {
        throw new GlobalError(501, "缺少填单人");
    }
    if (!params.a_dept_id) {
        throw new GlobalError(501, "缺少填单人部门");
    }
    if (!params.a_date) {
        throw new GlobalError(501, "缺少填单人日期");
    }
    if (!params.b_user_id) {
        throw new GlobalError(501, "缺少申请人");
    }
    if (!params.b_dept_id) {
        throw new GlobalError(501, "缺少申请人部门");
    }
    if (!params.b_date) {
        throw new GlobalError(501, "缺少申请人日期");
    }
    if (!params.payee) {
        throw new GlobalError(501, "缺少收款单位");
    }
    if (!params.bank_name) {
        throw new GlobalError(501, "缺少开户银行");
    }
    if (!params.bank_account) {
        throw new GlobalError(501, "缺少银行卡号");
    }
    if (!params.approve_user) {
        throw new GlobalError(501, "缺少审批人");
    }
    for (let detail of params.detailList) {
        validateDetail(detail);
    }
}

/**
 * 校验报销明细
 * @param {object} detail 报销明细
 */
function validateDetail(detail) {
    if (detail.number < 1) {
        throw new GlobalError(501, "报销明细的数量不能小于1");
    }
    if (detail.money <= 0) {
        throw new GlobalError(501, "报销明细的单价不能小于0元");
    }
    if (!detail.unit) {
        throw new GlobalError(501, "报销明细的单位必须填写");
    }
    if (!detail.subject_id) {
        throw new GlobalError(501, "请选择报销明细的科目");
    }
    if (!detail.name) {
        throw new GlobalError(501, "请输入报销明细的物品名称");
    }
}

/**
 * 取消一个报销流程
 * @param {object} params
 */
export const cancelBaoXiaoProcess = async (params) => {
    if (!params.id) {
        throw new GlobalError(500, "缺少参数");
    }
    let instance = await models.workflow_instance.findOne({
        attributes: ["id", "status"],
        where: {
            id: params.id,
            applicant: params.user_id,
            flow_key: BAOXIAO_KEY,
        },
        raw: true,
    });
    if (!instance) {
        throw new GlobalError(500, "找不到对应报销流程");
    }
    if (instance.status === WORKFLOW_INSTANCE_STATUS_END) {
        throw new GlobalError(500, "该报销流程已完成，无法取消！");
    }
    if (instance.status == WORKFLOW_INSTANCE_STATUS_CANCEL) {
        // 已经是取消状态，直接返回成功
        return;
    }
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs().unix();
        let res = await models.workflow_instance.update(
            {
                status: WORKFLOW_INSTANCE_STATUS_CANCEL,
                update_by: params.user_name,
                updatetime: now,
            },
            {
                where: {
                    id: instance.id,
                    status: instance.status,
                },
                transaction,
            }
        );
        if (!res) {
            throw new Error("修改报销实例状态失败");
        }
        res = await models.workflow_task.update(
            {
                status: WORKFLOW_TASK_STATUS_CANCEL,
                updatetime: now,
            },
            {
                where: {
                    wi_id: instance.id,
                },
                transaction,
            }
        );
        if (!res) {
            throw new Error("修改报销任务状态失败");
        }
        await transaction.commit();
    } catch (err) {
        global.logger.error("取消报销流程【%d】失败：%s", params.id, err.stack);
        await transaction.rollback();
        throw new GlobalError(500, "取消失败，请刷新页面重试，或者联系管理员");
    }
};

/**
 * 完成一个任务
 * @param {object} params
 */
export const completeBaoXiaoProcess = async (params) => {
    let res = await models.workflow_task.findOne({
        where: {
            id: params.id,
            actor_user_id: params.user_id,
        },
        raw: true,
    });
    if (!res) {
        throw new GlobalError(500, "找不到流程任务");
    }
    if (res.updatetime !== params.updatetime) {
        throw new GlobalError(506, "该流程实例已被编辑过，请刷新页面再审批!");
    }
    await baoXiaoWorkflowCtl.completeTask(params.id, params.user_name, {
        remark: params.remark,
    });
};

/**
 * 拒绝报销
 * @param {object} params
 */
export const rejectBaoXiaoProcess = async (params) => {
    let res = await models.workflow_task.findOne({
        where: {
            id: params.id,
            actor_user_id: params.user_id,
        },
    });
    if (!res) {
        throw new GlobalError(500, "找不到流程任务");
    }
    if (res.updatetime !== params.updatetime) {
        throw new GlobalError(506, "该流程实例已被编辑过，请刷新页面再审批!");
    }
    await baoXiaoWorkflowCtl.rejectTask(params.id, params.user_name, {
        remark: params.remark,
    });
};

/**
 * 银行转账
 * @param {object} params
 */
export const transfer = async (params) => {
    let sql = `
        SELECT t1.id, t1.wi_id, t2.flow_params, t2.refext
        FROM workflow_task t1
        LEFT JOIN workflow_instance t2 ON t1.wi_id = t2.id
        WHERE t1.id = ? AND t1.status = ? AND actor_user_id = ?
    `;
    let data = await sequelize.query(sql, {
        type: sequelize.QueryTypes.SELECT,
        replacements: [
            params.id,
            WORKFLOW_INSTANCE_STATUS_START,
            params.user_id,
        ],
        plain: true,
    });
    if (!data) {
        throw new GlobalError(501, "找不到对应报销流程");
    }
    if (data.refext) {
        // 已经有业务号了，说明已经转账了
        throw new GlobalError(502, "已转账，请勿重复转账");
    }
    data.flow_params = JSON.parse(data.flow_params);

    // 支付金额
    let trsamt = Number(data.flow_params.total_money).toFixed(2);

    const transaction = await sequelize.transaction();

    try {
        let res = await models.workflow_task.update(
            {
                params: JSON.stringify({
                    remark: params.remark,
                    operator: params.user_name,
                }),
                updatetime: now,
            },
            {
                where: {
                    id: params.id,
                },
            }
        );
        if (!res) {
            throw new Error("更新任务信息失败");
        }
        // 支付操作需要对接到财务系统
        res = await SystemService.transaction({
            // NOTE: 目前参数没用，后面会有用的。打款账户（用户打钱的银行账户ID）
            payId: 1,
            // 收方银行卡号
            toAccount: data.flow_params.bank_account,
            // 收方户名
            toName: data.flow_params.payee,
            // 转账金额
            money: trsamt,
            // 摘要
            summary: "报销款",
            // 收方银行
            bankName: data.flow_params.bank_name,
            // 收方开户行地址
            bankAddress: data.flow_params.bank_address,
        });
        global.logger.info("财务转账返回数据：%J", res);
        if (res.code != 1000) {
            throw new Error(res.msg);
        }

        // 业务参考号
        let refext = res.data.orderId;
        const now = dayjs().unix();
        res = await models.workflow_instance.update(
            {
                refext: refext,
                updatetime: now,
                update_by: params.user_name,
            },
            {
                where: {
                    id: data.wi_id,
                },
            }
        );

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(501, "转账失败：" + error.message);
    }
};

/**
 * 完成一个报销，需要银行账单到账才可以，给每日定时任务处理报销单使用
 * @param {string} refext 业务号
 */
export const finishTask = async (refext) => {
    let instance = await models.workflow_instance.findOne({
        attributes: [
            "id",
            "flow_key",
            "cur_node_id",
            "update_by",
            "flow_params",
        ],
        where: {
            refext: refext,
            status: WORKFLOW_INSTANCE_STATUS_START,
            flow_key: "BAOXIAO",
        },
        raw: true,
    });
    if (!instance) {
        return;
    }
    let task = await models.workflow_task.findOne({
        attributes: ["id", "actor_user_id", "updatetime"],
        where: {
            wi_id: instance.id,
            node_id: instance.cur_node_id,
            status: WORKFLOW_TASK_STATUS_START,
        },
        raw: true,
    });
    if (!task) {
        return;
    }
    // 开始完成报销
    await baoXiaoWorkflowCtl.completeTask(task.id, instance.update_by, {
        remark: "已到账",
    });

    // 招商银行账单
    let cbcBankBill = await models.cbc_bank_bill.findOne({
        where: {
            trsref: refext,
            status: 1,
        },
    });
    if (!cbcBankBill) {
        throw new Error(`找不到招商银行账单【${refext}】`);
    }

    const now = dayjs().unix();

    // 报销的内容
    let flowParams = JSON.parse(instance.flow_params);
    if (flowParams.payment) {
        // 是否买量，买量需要特殊处理
        const PAYMENT_SUBJECT_ID = "20010102";
        let settleId = uuidv4();
        let settleList = [];
        settleList.push({
            settle_id: settleId,
            day: cbcBankBill.trsdat,
            bank_bill_id: cbcBankBill.id,
            our_account_name: cbcBankBill.eacnam,
            our_account: cbcBankBill.eacnbr,
            other_account_name: cbcBankBill.relnam,
            other_account: cbcBankBill.relacc,
            type: 0,
            trsamt: cbcBankBill.trsamt,
            summary: cbcBankBill.txtclt,
            remark: cbcBankBill.remark,
            subject_id: PAYMENT_SUBJECT_ID,
            createtime: now,
        });
        // 报销明细
        for (let detail of flowParams.detailList) {
            settleList.push({
                settle_id: settleId,
                day: detail.start_date + " ~ " + detail.end_date,
                order_id: detail.payment_id,
                our_account_name: process.env.CBC_BANK_EACNAM,
                our_account: process.env.CBC_BANK_EACNBR,
                other_account_name: flowParams.payee,
                other_account: flowParams.bank_account,
                type: 2,
                money: detail.money,
                subject_id: detail.subject_id,
                summary: detail.name,
                remark: detail.remark,
                createtime: now,
            });
        }

        const transaction = await sequelize.transaction();
        try {
            let res = await models.cbc_bank_bill.update(
                {
                    status: 2,
                },
                {
                    where: {
                        id: cbcBankBill.id,
                        status: 1,
                    },
                    transaction,
                }
            );
            if (!res) {
                throw new Error("修改招商银行账单状态失败");
            }
            for (let settle of settleList) {
                await models.cbc_bank_settle.create(settle, { transaction });
            }
            // 请求商务系统的结算接口
            let settleParams = flowParams.detailList.map((item) => {
                return {
                    id: item.payment_id,
                    type: 2,
                };
            });
            res = await SystemService.settlement(settleParams);
            if (res.code != 1000) {
                throw new Error("商务结算失败");
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw new Error(err.message);
        }
    } else {
        for (let detail of flowParams.detailList) {
            let bankBillDetail = {
                bank_bill_id: cbcBankBill.id,
                day: flowParams.b_date,
                money: detail.money * detail.number,
                summary: detail.name,
                remark: detail.remark,
                subject: detail.subject_id,
                createtime: now,
                updatetime: now,
                create_by: "系统自动结算",
                update_by: "系统自动结算",
            };
            bankBillDetail = await models.cbc_bank_bill_detail.create(
                bankBillDetail
            );
        }
        // 修改招商银行账单状态为已结算
        await models.cbc_bank_bill.update(
            {
                status: 3,
            },
            {
                where: {
                    id: cbcBankBill.id,
                },
            }
        );
    }
};

/**
 * 获取对应ID的报销数据
 * @param {*} id
 */
export const getReimburInstance = async (id) => {
    const instance = await models.workflow_instance.findByPk(id, { raw: true });
    if (!instance) {
        throw new GlobalError(500, "找不到对应报销单");
    }
    return JSON.parse(instance.flow_params);
};

/**
 * 获取对应申请人的最新报销基本数据
 * @param {*} id
 */
export const getReimburBaseData = async (id) => {
    const data = await models.workflow_instance.findOne({
        where: {
            applicant: id,
        },
        order: [["createtime", "DESC"]],
        raw: true,
    });
    if (data) {
        return JSON.parse(data.flow_params);
    }
    return null;
};
