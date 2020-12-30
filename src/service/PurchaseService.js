import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import { sqlPage } from "../util/sqlPage";

const { models } = sequelize;

/**
 * 查询我的采购申请
 */
export const queryMyPurchase = async (params) => {
    let limit = params.size || 10;
    let page = params.page || 1;
    let offset = (page - 1) * limit;
    const where = {
        applicant: params.applicant,
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
    const data = await models.purchase.findAndCountAll({
        attributes: [
            "id",
            "applicant",
            "applicant_name",
            "date",
            "status",
            "reasons",
            "approvers",
            "detail",
            "images",
            "remark",
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
            temp.approvers = JSON.parse(item.approvers);
            temp.detail = JSON.parse(item.detail);
            temp.images = JSON.parse(item.images) || [];
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
 * 查询我的采购申请
 */
export const queryMyShenPi = async (params) => {
    let sql = `
        SELECT 
            t1.id AS task_id,
            t2.id,
            t2.applicant_name,
            t2.reasons,
            t2.remark,
            t2.date,
            t1.status,
            t2.detail,
            t2.images,
            t2.createtime,
            t1.updatetime
        FROM
        purchase_task t1
        LEFT JOIN purchase t2 ON t1.p_id = t2.id
        WHERE t1.actor_user_id = ?
    `;

    const replacements = [params.actor_user_id];

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
        temp.detail = JSON.parse(item.detail);
        temp.images = JSON.parse(item.images) || [];
        temp.createtime = dayjs
            .unix(temp.createtime)
            .format("YYYY-MM-DD HH:mm:ss");
        return temp;
    });

    return data;
};

/**
 * 提交采购申请
 */
export const submit = async (params) => {
    validate(params);
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs().unix();
        const purchaseTask = {
            stage: 1,
            actor_user_id: params.approvers[0].id,
            actor_user_name: params.approvers[0].user_name,
            status: 1,
            createtime: now,
            updatetime: now,
        };
        params.approvers = JSON.stringify(params.approvers);
        params.detail = JSON.stringify(params.detail);
        params.images = JSON.stringify(params.images);
        params.createtime = now;
        params.updatetime = now;
        let temp = await models.purchase.create(params, { transaction });

        purchaseTask.p_id = temp.id;
        await models.purchase_task.create(purchaseTask, { transaction });
        await transaction.commit();
    } catch (error) {
        global.logger.error("提交采购申请失败：%s", error.stack);
        await transaction.rollback();
        throw new GlobalError(500, "提交采购申请失败：" + error.message);
    }
};

/**
 * 编辑采购申请
 */
export const edit = async (params) => {
    validate(params);
    const now = dayjs().unix();
    params.approvers = JSON.stringify(params.approvers);
    params.detail = JSON.stringify(params.detail);
    params.images = JSON.stringify(params.images);
    params.updatetime = now;
    await models.purchase.update(params, {
        where: {
            id: params.id,
            applicant: params.applicant,
        },
    });
};

/**
 * 校验提交参数
 */
function validate(params) {
    if (!params.approvers || !params.approvers.length) {
        throw new GlobalError(500, "至少选择一个审批人");
    }
    // 是否选择了提交人是自己
    const exists = params.approvers.find((item) => params.applicant == item.id);
    if (exists) {
        throw new GlobalError(500, "审批人不能是自己");
    }
    if (!params.detail || !params.detail.length) {
        throw new GlobalError(500, "缺少采购明细");
    }
    if (!params.date) {
        throw new GlobalError(500, "缺少期望交付日期");
    }
    if (!params.reasons) {
        throw new GlobalError(500, "缺少申请事由");
    }
}

/**
 * 取消采购申请
 */
export const cancelPurchase = async (params) => {
    let purchase = await models.purchase.findOne({
        where: {
            id: params.id,
            applicant: params.applicant,
        },
        raw: true,
    });
    if (!purchase) {
        throw new GlobalError(500, "找不到对应采购申请");
    }
    const now = dayjs().unix();
    await models.purchase.update(
        {
            status: 3,
            updatetime: now,
            update_by: params.update_by,
        },
        {
            where: {
                id: params.id,
                applicant: params.applicant,
            },
        }
    );
    await models.purchase_task.update(
        {
            status: 3,
            updatetime: now,
        },
        {
            where: {
                p_id: params.id,
            },
        }
    );
};

/**
 * 查询采购实例流程状态
 */
export const queryInstanceProcessStatus = async (params) => {
    const purchase = await models.purchase.findOne({
        attributes: [
            "id",
            "status",
            "applicant_name",
            "createtime",
            "updatetime",
        ],
        where: {
            id: params.id,
        },
        raw: true,
    });
    if (!purchase) {
        throw new GlobalError(500, "找不到采购申请");
    }
    /// 任务列表
    const taskList = await models.purchase_task.findAll({
        where: {
            p_id: params.id,
        },
        order: [["stage", "ASC"]],
        raw: true,
    });
    const result = [
        {
            time: dayjs.unix(purchase.createtime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: purchase.applicant_name,
            msg: "发起报销",
            color: "#409eff",
        },
    ];

    taskList.forEach((task) => {
        let color = null;
        if (task.status === 2) {
            // 如果是完成状态，使用绿色标识
            color = "#67C23A";
        } else if (task.status === 3) {
            // 取消状态
            color = "#f55252";
        }
        result.push({
            time: dayjs.unix(task.updatetime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: task.actor_user_name,
            status: task.status,
            remark: task.remark,
            color,
        });
    });

    if (purchase.status === 2) {
        // 流程已结束
        result.push({
            time: dayjs.unix(purchase.updatetime).format("YYYY-MM-DD HH:mm:ss"),
            act_user: params.applicant_name,
            msg: "流程结束",
            color: "#409eff",
        });
    }

    return result;
};

/**
 * 查询采购实例
 */
export const queryInstance = async (id) => {
    const data = await models.purchase.findByPk(id, {
        attributes: [
            "id",
            "date",
            "reasons",
            "detail",
            "approvers",
            "remark",
            "images",
        ],
        raw: true,
    });
    data.detail = JSON.parse(data.detail);
    data.approvers = JSON.parse(data.approvers);
    data.images = JSON.parse(data.images) || [];
    return data;
};

/**
 * 完成采购任务
 */
export const completePurchaseTask = async (params) => {
    const { purchaseTask, purchase } = await checkPurchase(params);

    // 1.修改指定id的purchase_task数据的status，remark，updatetime
    // 2.如果当前是最后的审批任务，则完成采购审批流程
    // 3.如果当前不是最后的审批任务，则创建新审批任务
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs().unix();
        let [res] = await models.purchase_task.update(
            {
                status: 2,
                remark: params.remark,
                updatetime: now,
            },
            {
                where: {
                    id: params.id,
                    actor_user_id: params.user_id,
                    status: 1,
                },
                transaction,
            }
        );
        if (!res) {
            throw new Error("修改 purchase_task 状态失败");
        }
        let newPurchaseApprove = purchase.approvers[purchaseTask.stage];

        if (purchaseTask.stage >= purchase.approvers.length) {
            // 说明已经没有下一个审批人了，结束流程
            [res] = await models.purchase.update(
                {
                    status: 2,
                    updatetime: now,
                    update_by: params.user_name,
                },
                {
                    where: {
                        id: purchaseTask.p_id,
                        status: 1,
                    },
                    transaction,
                }
            );
            if (!res) {
                throw new Error("修改 purchase 状态失败");
            }
        } else if (newPurchaseApprove) {
            // 说明还有审批人
            [res] = await models.purchase.update(
                {
                    updatetime: now,
                    update_by: params.user_name,
                },
                {
                    where: {
                        id: purchaseTask.p_id,
                        status: 1,
                    },
                    transaction,
                }
            );
            if (!res) {
                throw new Error("修改 purchase 时间失败");
            }
            // 创建新审批任务
            const newPurchaseTask = {
                p_id: purchaseTask.p_id,
                stage: purchaseTask.stage + 1,
                actor_user_id: newPurchaseApprove.id,
                actor_user_name: newPurchaseApprove.user_name,
                status: 1,
                createtime: now,
                updatetime: now,
            };
            await models.purchase_task.create(newPurchaseTask, { transaction });
        } else {
            // 流程设定出现问题，可能是 purchaseTask.stage < 1。
            throw new Error("该流程审批出现异常，请联系管理员");
        }
        await transaction.commit();
    } catch (error) {
        global.logger.error("完成采购任务失败：%s", error.stack);
        await transaction.rollback();
        throw new GlobalError(500, "操作失败：" + error.message);
    }
};

/**
 * 驳回采购申请
 */
export const rejectPurchaseTask = async (params) => {
    const { purchaseTask, purchase } = await checkPurchase(params);

    const transaction = await sequelize.transaction();
    try {
        const now = dayjs().unix();
        let [res] = await models.purchase_task.update(
            {
                status: 4,
                remark: params.remark,
                updatetime: now,
            },
            {
                where: {
                    id: params.id,
                    actor_user_id: params.user_id,
                    status: 1,
                },
                transaction,
            }
        );
        if (!res) {
            throw new Error("修改 purchase_task 状态失败");
        }
        [res] = await models.purchase.update(
            {
                status: 4,
                updatetime: now,
                update_by: params.user_name,
            },
            {
                where: {
                    id: params.id,
                    status: 1,
                },
                transaction,
            }
        );
        if (!res) {
            throw new Error("修改 purchase 状态失败");
        }
        await transaction.commit();
    } catch (error) {
        global.logger.error("驳回采购任务失败：%s", error.stack);
        await transaction.rollback();
        throw new GlobalError(500, "操作失败：" + error.message);
    }
};

/**
 * 检查采购任务，采购流程
 */
async function checkPurchase(params) {
    const purchaseTask = await models.purchase_task.findOne({
        where: {
            id: params.id,
            actor_user_id: params.user_id,
            status: 1,
        },
        raw: true,
    });
    if (!purchaseTask) {
        throw new GlobalError(500, "找不到流程任务");
    }
    if (purchaseTask.updatetime !== params.updatetime) {
        throw new GlobalError(506, "该流程实例已被编辑过，请刷新页面再审批!");
    }

    const purchase = await models.purchase.findByPk(purchaseTask.p_id, {
        raw: true,
    });
    if (!purchase) {
        throw new GlobalError(500, "找不到采购申请");
    }
    if (purchase.status !== 1) {
        throw new GlobalError(500, "该采购流程已结束");
    }
    purchase.approvers = JSON.parse(purchase.approvers);

    return { purchaseTask, purchase };
}

/**
 * 查询采购转化为报销数据
 */
export const queryInstanceToReimbur = async (id, applicant) => {
    const purchase = await models.purchase.findOne({
        where: {
            id: id,
            applicant,
            status: 2,
        },
        raw: true,
    });
    let result = null;
    if (purchase) {
        const date = dayjs().format("YYYY-MM-DD");
        let detail = JSON.parse(purchase.detail);
        detail = detail.map((item) => {
            return {
                name: item.name,
                money: item.money,
                number: item.number,
                unit: item.unit,
                subject_id: item.subject_id,
                remark: "",
            };
        });
        result = {
            a_user_id: applicant,
            a_date: date,
            b_user_id: applicant,
            b_date: date,
            apply_type: "正常请款",
            pay_type: "银行转账",
            bank_name: "招商银行",
            bank_account: "",
            bank_address: "",
            payee: "",
            detailList: detail,
        };
    }
    return result;
};
