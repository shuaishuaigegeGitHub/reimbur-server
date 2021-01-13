import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import { sqlPage } from "../util/sqlPage";
import { sendMsg } from "@/service/DingtalkService";
import * as PermissionService from "@/service/PermissionService";

const { models } = sequelize;

// 采购 钉钉消息发送模板
const MARKDOWN_TEMPLATE = `
# $(h1)

申请事由：$(msg)

期望交付日期：$(date)
`;

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
            "copys",
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
            temp.copys = JSON.parse(item.copys) || [];
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
 * 查询我的采购申请
 */
export const queryMyCopy = async (params) => {
    let sql = `
        SELECT 
            id,
            applicant,
            applicant_name,
            date,
            status,
            reasons,
            approvers,
            copys,
            detail,
            images,
            remark,
            createtime,
            update_by,
            updatetime
        FROM
        purchase
        WHERE FIND_IN_SET(?, copy_ids)
        AND status = 2
    `;

    const replacements = [params.user_id];

    if (params.applyTime) {
        sql += " AND createtime BETWEEN ? AND ? ";
        let start = dayjs(params.applyTime[0], "YYYY-MM-DD").unix();
        let end = dayjs(params.applyTime[1], "YYYY-MM-DD").endOf("date").unix();
        replacements.push(start);
        replacements.push(end);
    }

    sql += " ORDER BY createtime DESC ";

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
        // 取出抄送人ID列表
        params.copy_ids = params.copys.map((item) => item.id).join(",");
        params.copys = JSON.stringify(params.copys);
        params.detail = JSON.stringify(params.detail);
        params.images = JSON.stringify(params.images);
        params.createtime = now;
        params.updatetime = now;
        let temp = await models.purchase.create(params, { transaction });

        purchaseTask.p_id = temp.id;
        await models.purchase_task.create(purchaseTask, { transaction });

        // 记录采购流程信息
        await models.purchase_process.create(
            {
                p_id: temp.id,
                username: params.applicant_name,
                userid: params.applicant,
                msg: "发起采购",
                time: dayjs.unix(now).format("YYYY-MM-DD HH:mm:ss"),
                createtime: now,
            },
            { transaction }
        );
        // 发送钉钉提示
        sendMessage({
            userid: purchaseTask.actor_user_id,
            h1: params.applicant_name + "提交的采购申请",
            msg: params.reasons,
            date: params.date,
        });
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
    const transaction = await sequelize.transaction();

    const purchaseTask = {
        p_id: params.id,
        stage: 1,
        actor_user_id: params.approvers[0].id,
        actor_user_name: params.approvers[0].user_name,
        status: 1,
        createtime: now,
        updatetime: now,
    };

    params.approvers = JSON.stringify(params.approvers);
    // 取出抄送人ID列表
    params.copy_ids = params.copys.map((item) => item.id).join(",");
    params.copys = JSON.stringify(params.copys);
    params.detail = JSON.stringify(params.detail);
    params.images = JSON.stringify(params.images);
    params.updatetime = now;

    try {
        // 更新采购信息表
        await models.purchase.update(params, {
            where: {
                id: params.id,
                applicant: params.applicant,
            },
            transaction,
        });
        // 删除原本对应的采购审批任务数据
        await models.purchase_task.destroy({
            where: {
                p_id: params.id,
            },
            transaction,
        });
        // 新增采购任务表
        await models.purchase_task.create(purchaseTask, { transaction });
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, "编辑采购申请失败：" + error.message);
    }
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
    await models.purchase_process.create({
        p_id: params.id,
        username: params.update_by,
        userid: params.applicant,
        msg: "取消采购",
        flag: 3,
        time: dayjs.unix(now).format("YYYY-MM-DD HH:mm:ss"),
        createtime: now,
    });
};

/**
 * 查询采购实例流程状态
 */
export const queryInstanceProcessStatus = async (params) => {
    const purchaseProcessList = await models.purchase_process.findAll({
        where: {
            p_id: params.id,
        },
        order: [["createtime", "ASC"]],
        raw: true,
    });
    if (purchaseProcessList.length === 0) {
        throw new GlobalError(500, "找不到对应的采购流程");
    }
    // 找到最近一条还未审批的任务（一般只会有一条未审批的任务，如果没有，说明流程结束了）
    const lastTask = await models.purchase_task.findOne({
        where: {
            p_id: params.id,
            status: 1,
        },
        order: [["createtime", "DESC"]],
        raw: true,
    });

    if (lastTask) {
        // 还有未审批的任务，流程未结束
        purchaseProcessList.push({
            time: dayjs.unix(lastTask.updatetime).format("YYYY-MM-DD HH:mm:ss"),
            username: lastTask.actor_user_name,
            msg: "审批中",
            flag: 2,
        });
    }

    return purchaseProcessList;
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
            "copys",
            "remark",
            "images",
        ],
        raw: true,
    });
    data.detail = JSON.parse(data.detail);
    data.approvers = JSON.parse(data.approvers);
    data.copys = JSON.parse(data.copys) || [];
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
        // 发送钉钉提醒的数据
        let sendDingdingMsg = null;
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
            // 发送给申请人，提示钉钉审批已通过
            sendDingdingMsg = {
                userid: purchase.applicant,
                h1: purchase.applicant_name + "提交的采购申请已通过",
                msg: purchase.reasons,
                date: purchase.date,
                title: "采购通过",
            };
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
            // 发送钉钉提醒
            sendDingdingMsg = {
                userid: newPurchaseApprove.id,
                h1: newPurchaseApprove.user_name + "提交的采购申请",
                msg: purchase.reasons,
                date: purchase.date,
            };
        } else {
            // 流程设定出现问题，可能是 purchaseTask.stage < 1。
            throw new Error("该流程审批出现异常，请联系管理员");
        }
        // 记录采购流程信息
        await models.purchase_process.create(
            {
                p_id: purchase.id,
                username: params.user_name,
                userid: params.user_id,
                msg: "同意采购",
                remark: params.remark,
                time: dayjs.unix(now).format("YYYY-MM-DD HH:mm:ss"),
                createtime: now,
            },
            { transaction }
        );
        if (purchaseTask.stage >= purchase.approvers.length) {
            // 流程结束，记录采购流程信息
            await models.purchase_process.create(
                {
                    p_id: purchase.id,
                    username: "",
                    userid: 0,
                    msg: "采购流程结束",
                    time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                    createtime: dayjs().unix(),
                },
                { transaction }
            );
        }
        await transaction.commit();
        if (sendDingdingMsg) {
            sendMessage(sendDingdingMsg);
        }
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
    const { purchase } = await checkPurchase(params);

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
        // 记录采购流程信息
        await models.purchase_process.create(
            {
                p_id: purchase.id,
                username: params.user_name,
                userid: params.user_id,
                flag: 4,
                msg: "驳回采购",
                remark: params.remark,
                time: dayjs.unix(now).format("YYYY-MM-DD HH:mm:ss"),
                createtime: now,
            },
            { transaction }
        );
        await transaction.commit();
        // 发送钉钉提醒
        sendMessage({
            userid: purchase.applicant,
            h1: "采购申请被驳回",
            msg: purchase.reasons,
            date: purchase.date,
            title: "采购驳回",
        });
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
            copys: [],
        };
    }
    return result;
};

/**
 * 查询最近一次的抄送人列表
 */
export const queryLastCopyList = async (user_id) => {
    const purchase = await models.purchase.findOne({
        where: {
            applicant: user_id,
        },
        order: [["createtime", "DESC"]],
        raw: true,
    });
    if (purchase && purchase.copys) {
        return JSON.parse(purchase.copys);
    }
    return null;
};

/**
 * 添加评论
 */
export const addComment = async (params) => {
    await models.purchase_process.create({
        p_id: params.id,
        userid: params.userid,
        username: params.username,
        remark: params.remark,
        msg: "添加了评论",
        time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        createtime: dayjs().unix(),
    });
    const purchase = await models.purchase.findByPk(params.id, { raw: true });
    const purchaseTaskList = await models.purchase_task.findAll({
        attributes: ["id", "actor_user_id"],
        where: {
            p_id: params.id,
        },
        raw: true,
    });
    const ids = [];
    if (params.userid != purchase.applicant) {
        ids.push(purchase.applicant);
    }
    purchaseTaskList.forEach((item) => {
        if (params.userid != item.actor_user_id) {
            ids.push(item.actor_user_id);
        }
    });
    // 发送钉钉提醒
    sendMessage({
        userid: ids,
        h1: params.username + " 评论：" + params.remark,
        msg: purchase.reasons,
        date: purchase.date,
        title: "采购评论",
    });
};

/**
 * 钉钉发送消息（工作通知）
 */
async function sendMessage({ userid, h1, msg, date, title = "采购审批" }) {
    // 根据系统用户ID获取钉钉用户ID
    const data = await PermissionService.getDingtalkIdByUserId([userid]);
    const dingtalkUserId = data.map((item) => item.dingding_id).join(",");
    const content = {
        msgtype: "action_card",
        action_card: {
            title,
            markdown: MARKDOWN_TEMPLATE.replace("$(h1)", h1)
                .replace("$(msg)", msg)
                .replace("$(date)", date),
            single_title: "前往查看",
            single_url: "https://reimbur.feigo.fun/#/reimbur/index",
        },
    };
    sendMsg(dingtalkUserId, content);
}
