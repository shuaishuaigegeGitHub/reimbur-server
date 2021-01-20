import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import { sqlPage } from "../util/sqlPage";
import { sendMsg } from "@/service/DingtalkService";
import * as PermissionService from "@/service/PermissionService";
import NP from "number-precision";
import { v4 as uuidv4 } from "uuid";

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
            "copys",
            "images",
            "total_money",
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
            t2.total_money,
            t2.images,
            t2.copys,
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
        temp.images = JSON.parse(item.images) || [];
        temp.copys = JSON.parse(item.copys) || [];
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
    let count = await models.purchase_task.count({
        where: {
            actor_user_id: params.id,
            status: 1,
        },
    });
    return count;
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
            total_money,
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
        temp.images = JSON.parse(item.images) || [];
        temp.copys = JSON.parse(item.copys) || [];
        temp.createtime = dayjs
            .unix(temp.createtime)
            .format("YYYY-MM-DD HH:mm:ss");
        temp.updatetime = dayjs
            .unix(temp.updatetime)
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
        const details = params.detail;
        params.approvers = JSON.stringify(params.approvers);
        // 取出抄送人ID列表
        params.copy_ids = params.copys.map((item) => item.id).join(",");
        params.copys = JSON.stringify(params.copys);
        params.images = JSON.stringify(params.images);
        params.createtime = now;
        params.updatetime = now;

        // 计算总价格
        params.total_money = params.detail
            .map((item) => NP.round(NP.times(item.money, item.number), 2))
            .reduce((prev, cur) => {
                return NP.round(NP.plus(prev, cur), 2);
            }, 0);

        let temp = await models.purchase.create(params, { transaction });

        purchaseTask.p_id = temp.id;
        await models.purchase_task.create(purchaseTask, { transaction });

        details.forEach((item, index) => {
            item.index = index;
            item.p_id = temp.id;
        });

        await models.purchase_detail.bulkCreate(details, { transaction });

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
            userid: [purchaseTask.actor_user_id],
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

    const purchaseTask = {
        p_id: params.id,
        stage: 1,
        actor_user_id: params.approvers[0].id,
        actor_user_name: params.approvers[0].user_name,
        status: 1,
        createtime: now,
        updatetime: now,
    };

    const details = params.detail;

    params.approvers = JSON.stringify(params.approvers);
    // 取出抄送人ID列表
    params.copy_ids = params.copys.map((item) => item.id).join(",");
    params.copys = JSON.stringify(params.copys);
    params.images = JSON.stringify(params.images);
    params.updatetime = now;
    params.status = 1;
    // 计算总价格
    params.total_money = params.detail
        .map((item) => NP.round(NP.times(item.money, item.number), 2))
        .reduce((prev, cur) => {
            return NP.round(NP.plus(prev, cur), 2);
        }, 0);

    const transaction = await sequelize.transaction();

    try {
        const purchase = await models.purchase.findByPk(params.id, {
            raw: true,
            transaction,
        });
        if (purchase.status === 2) {
            // 流程已结束，不能编辑
            throw new Error("该流程已通过无法编辑");
        }
        // 明细是否有被报销
        const reimburCount = await models.purchase_detail.count({
            where: {
                p_id: params.id,
                status: 1,
            },
            transaction,
        });
        if (reimburCount) {
            // 流程已结束，不能编辑
            throw new Error("该采购已被报销，无法编辑");
        }
        // 删除原本对应的采购审批任务数据
        await models.purchase_task.destroy({
            where: {
                p_id: params.id,
            },
            transaction,
        });
        await models.purchase_process.create(
            {
                p_id: params.id,
                username: purchase.applicant_name,
                userid: purchase.applicant,
                msg: "重新编辑了采购申请",
                flag: 1,
                time: dayjs.unix(now).format("YYYY-MM-DD HH:mm:ss"),
                createtime: now,
            },
            { transaction }
        );
        // 钉钉提醒
        let dingtalkMsg = {
            userid: [purchaseTask.actor_user_id],
            h1: params.applicant_name + "重新编辑了采购申请",
            msg: params.reasons,
            date: params.date,
        };
        // 更新采购信息表
        await models.purchase.update(params, {
            where: {
                id: params.id,
                applicant: params.applicant,
            },
            transaction,
        });
        // 新增采购任务表
        await models.purchase_task.create(purchaseTask, { transaction });
        // 删除明细表，并且新建明细
        await models.purchase_detail.destroy({
            where: {
                p_id: params.id,
            },
            transaction,
        });
        details.forEach((item, index) => {
            item.index = index;
            item.p_id = params.id;
            item.status = 0;
        });
        await models.purchase_detail.bulkCreate(details, { transaction });
        await transaction.commit();
        if (dingtalkMsg) {
            // 发送钉钉提醒
            sendMessage(dingtalkMsg);
        }
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
 * 查询采购流程数据和明细数据
 */
export const queryProcessDetail = async (params) => {
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
            username: lastTask.actor_user_name,
            msg: "审批中",
            flag: 2,
        });
    } else {
        // 流程结束
        purchaseProcessList.push({
            username: "",
            msg: "采购流程结束",
            flag: 1,
        });
    }

    // 查询明细数据
    const details = await models.purchase_detail.findAll({
        where: {
            p_id: params.id,
        },
        order: [["index", "ASC"]],
    });

    return {
        actList: purchaseProcessList,
        details,
    };
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
            "approvers",
            "copys",
            "total_money",
            "remark",
            "images",
        ],
        raw: true,
    });
    data.approvers = JSON.parse(data.approvers);
    data.copys = JSON.parse(data.copys) || [];
    data.images = JSON.parse(data.images) || [];
    data.detail = await models.purchase_detail.findAll({
        where: {
            p_id: id,
        },
        raw: true,
        order: [["index", "ASC"]],
    });
    return data;
};

/**
 * 完成采购任务
 */
export const completePurchaseTask = async (params) => {
    const { purchaseTask, purchase } = await checkPurchase(params);
    params.remark = params.remark || "";

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
                userid: [purchase.applicant],
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
                userid: [newPurchaseApprove.id],
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
                    id: purchase.id,
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
        let detail = await models.purchase_detail.findAll({
            where: {
                p_id: id,
            },
            raw: true,
            order: [["index", "ASC"]],
        });
        const date = dayjs().format("YYYY-MM-DD");
        detail = detail.map((item) => {
            return {
                id: item.id,
                name: item.name,
                money: item.money,
                number: item.number,
                unit: item.unit,
                subject_id: null,
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

// 采购 钉钉消息发送模板
const MARKDOWN_TEMPLATE = `
# $(h1)

申请事由：$(msg)

期望交付日期：$(date)
`;

/**
 * 钉钉发送消息（工作通知）
 */
async function sendMessage({ userid, h1, msg, date, title = "采购审批" }) {
    // 根据系统用户ID获取钉钉用户ID
    const data = await PermissionService.getDingtalkIdByUserId(userid);
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
