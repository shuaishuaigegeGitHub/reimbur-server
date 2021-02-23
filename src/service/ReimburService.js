import sequelize from "../model/index";
import { Op, QueryTypes } from "sequelize";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import * as PermissionService from "@/service/PermissionService";
import * as DingtalkService from "@/service/DingtalkService";
import NP from "number-precision";
import * as SystemService from "./SystemService";

const { models } = sequelize;

// 发票号正则校验规则
const RECEIPT_NUMBER_REGEX = /[A-Z0-9]{6,8}/;

// 最大报销金额
const MAX_MONEY = 99999999;

/**
 * 获取报销流程定义
 */
async function getReimburDefine() {
    const workflow = await models.workflow.findOne({
        where: {
            flow_key: "REIMBUR",
        },
        raw: true,
    });
    return JSON.parse(workflow.flow_define);
}

/**
 * 提交报销申请
 */
export const submit = async (params) => {
    // 检查参数
    const totalMoney = checkParamAndCalTotalMoney(params);

    // 报销流程
    const reimburDefine = await getReimburDefine();

    // 第一个审批操作是自己选上级进行操作
    reimburDefine[0].approveUser = params.approve_user;
    reimburDefine[0].approveUserName = params.approve_user_name;

    const transaction = await sequelize.transaction();
    const detailList = params.detailList;
    // 采购明细ID
    const purchaseIdList = detailList
        .filter((item) => {
            return item.pd_id;
        })
        .map((item) => item.pd_id);
    const list = await models.reimbur_detail.findAll({
        where: {
            pd_id: purchaseIdList,
        },
    });
    if (list.length) {
        throw new GlobalError(500, `【${list[0].pd_id}】采购明细已报销过`);
    }
    try {
        const now = dayjs();

        params.stage = reimburDefine[0].id;
        params.flow_define = JSON.stringify(reimburDefine);
        params.total_money = totalMoney;
        params.createtime = now.unix();
        params.updatetime = now.unix();
        params.update_by = params.create_by;

        // 报销数据保存
        let reimburData = await models.reimbur.create(params, { transaction });

        // 抄送人数据
        const copysData = params.copys.map((item) => {
            return {
                r_id: reimburData.id,
                user_id: item.id,
                user_name: item.user_name,
                avatar: item.avatar,
            };
        });
        if (copysData.length) {
            await models.reimbur_copy.bulkCreate(copysData, { transaction });
        }

        // 明细记录
        detailList.forEach((item) => {
            item.r_id = reimburData.id;
        });
        await models.reimbur_detail.bulkCreate(detailList, { transaction });

        // 创建审核任务
        const task = {
            r_id: reimburData.id,
            stage: params.stage,
            act_user_id: params.approve_user,
            act_user_name: params.approve_user_name,
            status: 1,
            createtime: now.unix(),
            updatetime: now.unix(),
        };

        await models.reimbur_task.create(task, { transaction });

        // 流程记录
        const process = {
            w_id: reimburData.id,
            userid: params.create_id,
            username: params.create_by,
            flag: 2,
            msg: "发起了报销",
            time: now.format("YYYY-MM-DD HH:mm:ss"),
            createtime: now.unix(),
        };
        await models.reimbur_process.create(process, { transaction });

        if (purchaseIdList.length) {
            // 把采购ID的数据都设置为已报销
            await models.purchase_detail.update(
                {
                    status: 1,
                },
                {
                    where: {
                        id: purchaseIdList,
                    },
                    transaction,
                }
            );
        }

        await transaction.commit();
        // 发送钉钉任务提醒
        const data = {
            userids: [params.approve_user],
            totalMoney: totalMoney,
            date: params.date,
            title: "报销审批",
            reason: params.reason,
            h1: params.create_by + "提交的报销申请",
        };
        sendMessage(data);
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
};

/**
 * 检查参数
 * @param {*} params
 */
function checkParamAndCalTotalMoney(params) {
    if (!params.approve_user) {
        throw new GlobalError(500, "缺少参数【上级审批人】");
    }
    if (!params.applicant) {
        throw new GlobalError(500, "缺少参数【申请人】");
    }
    if (!params.applicant_dept) {
        throw new GlobalError(500, "缺少参数【申请人部门】");
    }
    if (!params.date) {
        throw new GlobalError(500, "缺少参数【日期】");
    }
    if (!params.payee) {
        throw new GlobalError(500, "缺少参数【收款单位】");
    }
    if (!params.bank_account) {
        throw new GlobalError(500, "缺少参数【银行卡号】");
    }
    if (!params.bank_name) {
        throw new GlobalError(500, "缺少参数【开户银行】");
    }
    if (!params.bank_address) {
        throw new GlobalError(500, "缺少参数【开户地址】");
    }
    if (!params.reason) {
        throw new GlobalError(500, "缺少参数【申请事由】");
    }
    if (!params.detailList && !params.detailList.length) {
        throw new GlobalError(500, "缺少报销明细");
    }
    let totalMoney = 0;
    params.detailList.forEach((detail) => {
        checkDetailParam(detail, params.apply_type);
        totalMoney = NP.round(
            NP.plus(totalMoney, detail.number * detail.money),
            2
        );
    });
    if (totalMoney > MAX_MONEY) {
        throw new GlobalError(500, `最大报销金额【${MAX_MONEY}】`);
    }
    return totalMoney;
}

/**
 * 检查报销明细内容
 */
function checkDetailParam(detail, apply_type) {
    if (apply_type == 1) {
        // 正常请款
        if (!detail.receipt_number) {
            throw new GlobalError(500, "正常请款需要提供发票号");
        }
        detail.receipt_number = detail.receipt_number.replace(/，/g, ",");
        let receipt_number_list = detail.receipt_number.split(",");
        receipt_number_list.forEach((item) => {
            if (!RECEIPT_NUMBER_REGEX.test(item)) {
                throw new GlobalError(500, `发票号【${item}】格式不正确`);
            }
        });
    }
    if (detail.money <= 0) {
        throw new GlobalError(500, "单价不能低于0元");
    }
    if (detail.number < 1) {
        throw new GlobalError(500, "数量不能低于1");
    }
    if (!detail.name) {
        throw new GlobalError(500, "物品名称不能为空");
    }
}

/**
 * 查询我的申请
 */
export const queryApplication = async (params) => {
    const { userid, page = 1, size = 10, status, applyTime } = params;
    let where = {
        applicant: userid,
    };
    if (status) {
        where.status = status;
    }
    if (applyTime) {
        where.createtime = {
            [Op.between]: applyTime.map((time) =>
                dayjs(time, "YYYY-MM-DD").unix()
            ),
        };
    }
    const result = await models.reimbur.findAndCountAll({
        attributes: [
            "id",
            "p_id",
            "applicant",
            "applicant_name",
            "applicant_dept",
            "applicant_dept_name",
            "apply_type",
            "bank_address",
            "bank_address",
            "bank_name",
            "bank_account",
            "date",
            "payee",
            "pay_type",
            "stage",
            "status",
            "reason",
            "status",
            "total_money",
            "create_by",
            "create_id",
            "createtime",
            "create_dept_id",
            "create_dept_name",
            "updatetime",
            "refext",
            "update_by",
            "updatetime",
        ],
        where,
        order: [["createtime", "DESC"]],
        offset: Math.floor((page - 1) * size),
        limit: size,
        raw: true,
    });
    return result;
};

/**
 * 查询我的审批
 */
export const queryApprove = async (params) => {
    const { userid, status, applyTime, page = 1, size = 10 } = params;
    let countSql = `
        SELECT COUNT(*) AS \`count\`
        FROM reimbur_task t1
        LEFT JOIN reimbur t2 ON t1.r_id = t2.id
        WHERE t1.act_user_id = ?
    `;
    let dataSql = `
        SELECT 
            t1.id AS task_id,
            t1.status AS task_status,
            t2.id,
            t2.p_id,
            t2.applicant,
            t2.applicant_name,
            t2.applicant_dept,
            t2.applicant_dept_name,
            t2.apply_type,
            t2.bank_address,
            t2.bank_address,
            t2.bank_name,
            t2.bank_account,
            t2.date,
            t2.payee,
            t2.pay_type,
            t2.stage,
            t2.status,
            t2.reason,
            t2.status,
            t2.total_money,
            t2.create_by,
            t2.create_id,
            t2.createtime,
            t2.create_dept_id,
            t2.create_dept_name,
            t2.updatetime,
            t2.refext,
            t2.update_by,
            t2.updatetime
        FROM reimbur_task t1
        LEFT JOIN reimbur t2 ON t1.r_id = t2.id
        WHERE t1.act_user_id = ?
    `;
    const replacements = [userid];
    if (status) {
        countSql += " AND t1.status = ? ";
        dataSql += " AND t1.status = ? ";
        replacements.push(status);
    }
    if (applyTime) {
        countSql += " AND t2.createtime BETWEEN ? AND ? ";
        dataSql += " AND t2.createtime BETWEEN ? AND ? ";
        replacements.push(dayjs(applyTime[0], "YYYY-MM-DD").unix());
        replacements.push(dayjs(applyTime[1], "YYYY-MM-DD").unix());
    }
    const countData = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT,
        plain: true,
    });

    dataSql += " LIMIT ?, ? ";
    replacements.push(Math.floor((page - 1) * size));
    replacements.push(Number(size));
    const rows = await sequelize.query(dataSql, {
        replacements,
        type: QueryTypes.SELECT,
    });
    return {
        count: countData.count,
        rows,
    };
};

/**
 * 抄送给我
 */
export const queryCopyToMe = async (params) => {
    const { userid, applyTime, page = 1, size = 10 } = params;
    let countSql = `
        SELECT COUNT(*) AS \`count\`
        FROM reimbur_task t1
        LEFT JOIN reimbur t2 ON t1.r_id = t2.id
        WHERE t1.act_user_id = ?
    `;
    let dataSql = `
        SELECT 
            t2.id,
            t2.p_id,
            t2.applicant,
            t2.applicant_name,
            t2.applicant_dept,
            t2.applicant_dept_name,
            t2.apply_type,
            t2.bank_address,
            t2.bank_address,
            t2.bank_name,
            t2.bank_account,
            t2.date,
            t2.payee,
            t2.pay_type,
            t2.stage,
            t2.status,
            t2.reason,
            t2.status,
            t2.total_money,
            t2.create_by,
            t2.create_id,
            t2.createtime,
            t2.create_dept_id,
            t2.create_dept_name,
            t2.updatetime,
            t2.refext,
            t2.update_by,
            t2.updatetime
        FROM reimbur_copy t1
        LEFT JOIN reimbur t2 ON t1.r_id = t2.id
        WHERE t1.user_id = ? AND t2.status = 2
    `;
    const replacements = [userid];
    if (applyTime) {
        countSql += " AND t2.createtime BETWEEN ? AND ? ";
        dataSql += " AND t2.createtime BETWEEN ? AND ? ";
        replacements.push(dayjs(applyTime[0], "YYYY-MM-DD").unix());
        replacements.push(dayjs(applyTime[1], "YYYY-MM-DD").unix());
    }
    const countData = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT,
        plain: true,
    });

    dataSql += " LIMIT ?, ? ";
    replacements.push(Math.floor((page - 1) * size));
    replacements.push(Number(size));
    const rows = await sequelize.query(dataSql, {
        replacements,
        type: QueryTypes.SELECT,
    });
    return {
        count: countData.count,
        rows,
    };
};

/**
 * 查询待我审批个数
 */
export const queryMyShenpiCount = async (userid) => {
    return await models.reimbur_task.count({
        where: {
            act_user_id: userid,
            status: 1,
        },
    });
};

/**
 * 查询报销申请详细和流程信息
 */
export const queryDetailAndProcess = async (id) => {
    const detailList = await models.reimbur_detail.findAll({
        where: {
            r_id: id,
        },
        raw: true,
    });
    const processList = await models.reimbur_process.findAll({
        where: {
            w_id: id,
        },
        raw: true,
    });
    const copys = await models.reimbur_copy.findAll({
        where: {
            r_id: id,
        },
        raw: true,
    });
    let lastTask = await models.reimbur_task.findOne({
        where: {
            r_id: id,
            status: 1,
        },
        raw: true,
    });
    if (lastTask) {
        if (lastTask.remark) {
            // 处于status=1，并且remark不为空，肯定是出纳转账等待银行到账阶段
            processList.push({
                username: "",
                flag: 0,
                msg: "等待银行到账",
            });
        } else {
            processList.push({
                username: lastTask.act_user_name,
                flag: 0,
                msg: "审批中",
            });
        }
    }
    return {
        detailList,
        processList,
        copys,
    };
};

/**
 * 添加评论
 */
export const addComment = async (params) => {
    const now = dayjs();
    const data = {
        w_id: params.id,
        remark: params.remark,
        userid: params.userid,
        username: params.username,
        flag: 1,
        msg: "添加了评论",
        time: now.format("YYYY-MM-DD HH:mm:ss"),
        createtime: now.unix(),
    };
    await models.reimbur_process.create(data);

    // 批量发送钉钉提醒
    bulkSendDingtalk(params.id, params);
};

/**
 * 查询指定可编辑的报销数据
 */
export const queryEditable = async (params) => {
    const reimbur = await models.reimbur.findOne({
        where: {
            id: params.id,
            applicant: params.userid,
        },
        raw: true,
    });
    if (!reimbur) {
        throw new GlobalError(500, "找不到报销申请单");
    }
    if (reimbur.status == 2) {
        throw new GlobalError(500, "报销流程已结束，无法编辑");
    }
    if (reimbur.status == 1 && reimbur.stage != "stage-dept") {
        throw new GlobalError("报销已被审批，无法编辑");
    }
    let define = JSON.parse(reimbur.flow_define);
    reimbur.approve_user = define[0].approveUser;
    const detailList = await models.reimbur_detail.findAll({
        where: {
            r_id: params.id,
        },
        raw: true,
    });
    reimbur.detailList = detailList;
    delete reimbur.flow_define;
    const copys = await models.reimbur_copy.findAll({
        where: {
            r_id: params.id,
        },
        raw: true,
    });
    reimbur.copys = copys.map((item) => {
        return {
            id: item.user_id,
            user_name: item.user_name,
            avatar: item.avatar,
        };
    });
    return reimbur;
};

/**
 * 编辑
 */
export const edit = async (params) => {
    // 检查参数
    const totalMoney = checkParamAndCalTotalMoney(params);
    const now = dayjs();
    const exists = await models.reimbur.findByPk(params.id, {
        attributes: ["id", "status", "flow_define"],
        raw: true,
    });
    if (!exists) {
        throw new GlobalError(500, "报销数据不存在");
    }
    const flowDefine = JSON.parse(exists.flow_define);
    const reimburData = {
        p_id: params.p_id,
        date: params.date,
        status: 1,
        stage: flowDefine[0].id,
        apply_type: params.apply_type,
        pay_type: params.pay_type,
        payee: params.payee,
        bank_name: params.bank_name,
        bank_account: params.bank_account,
        bank_address: params.bank_address,
        total_money: totalMoney,
        reason: params.reason,
        update_by: params.username,
        updatetime: now.unix(),
    };
    // 更新明细表，发送钉钉消息
    const transaction = await sequelize.transaction();
    try {
        const detailList = params.detailList.map((item) => {
            item.r_id = params.id;
            return item;
        });

        // 更新报销信息
        await models.reimbur.update(reimburData, {
            where: {
                id: params.id,
            },
            transaction,
        });

        // 清空原本的明细信息
        await models.reimbur_detail.destroy({
            where: {
                r_id: params.id,
            },
            transaction,
        });
        // 保存新的明细信息
        await models.reimbur_detail.bulkCreate(detailList, { transaction });

        // 清空原本抄送人，保存新抄送人
        const copysData = params.copys.map((item) => {
            return {
                r_id: params.id,
                user_id: item.id,
                user_name: item.user_name,
                avatar: item.avatar,
            };
        });
        await models.reimbur_copy.destroy(
            {
                where: {
                    r_id: params.id,
                },
            },
            { transaction }
        );
        if (copysData.length) {
            await models.reimbur_copy.bulkCreate(copysData, { transaction });
        }

        // 记录流程操作信息
        await models.reimbur_process.create(
            {
                w_id: params.id,
                userid: params.userid,
                username: params.username,
                flag: 2,
                msg: "重新编辑了报销信息",
                time: now.format("YYYY-MM-DD HH:mm:ss"),
                createtime: now.unix(),
            },
            { transaction }
        );

        let approveUser = flowDefine[0].approveUser;
        let approveUserName = flowDefine[0].approveUserName;
        // 删除原本的任务
        await models.reimbur_task.destroy({
            where: {
                r_id: params.id,
                act_user_id: approveUser,
            },
            transaction,
        });
        // 创建新任务
        await models.reimbur_task.create(
            {
                r_id: params.id,
                stage: flowDefine[0].id,
                act_user_id: approveUser,
                act_user_name: approveUserName,
                createtime: now.unix(),
                updatetime: now.unix(),
            },
            { transaction }
        );
        await transaction.commit();

        // 发送给审批人钉钉消息
        sendMessage({
            userids: [approveUser],
            totalMoney,
            date: params.date,
            reason: params.reason,
            title: "报销审批",
            h1: params.username + "重新编辑了报销内容",
        });
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
};

/**
 * 取消
 */
export const cancel = async (params) => {
    const reimbur = await models.reimbur.findOne({
        attributes: ["id", "status", "total_money", "date", "reason"],
        where: {
            id: params.id,
            applicant: params.userid,
            status: 1,
        },
        raw: true,
    });
    if (!reimbur) {
        throw new GlobalError(500, "找不到对应的报销数据");
    }
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs();
        await models.reimbur.update(
            {
                status: 3,
                update_by: params.username,
                updatetime: now.unix(),
            },
            {
                where: {
                    id: params.id,
                },
                transaction,
            }
        );
        // 把未完成的任务修改为已取消
        await models.reimbur_task.update(
            {
                status: 3,
                updatetime: now.unix(),
            },
            {
                where: {
                    r_id: params.id,
                    status: 1,
                },
                transaction,
            }
        );
        // 记录流程信息
        await models.reimbur_process.create(
            {
                w_id: params.id,
                userid: params.userid,
                username: params.username,
                flag: 3,
                msg: "取消了报销流程",
                time: now.format("YYYY-MM-DD HH:mm:ss"),
                createtime: now.unix(),
            },
            { transaction }
        );
        await transaction.commit();

        const task = await models.reimbur_task.findOne({
            where: {
                r_id: params.id,
                status: 1,
            },
            raw: true,
        });
        if (task) {
            // 发送给审批人钉钉消息
            sendMessage({
                userids: [task.act_user_id],
                totalMoney: reimbur.total_money,
                date: reimbur.date,
                reason: reimbur.reason,
                title: "报销审批",
                h1: params.username + "重新编辑了报销内容",
            });
        }
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
};

/**
 * 同意
 */
export const agree = async (params) => {
    const { task_id, remark, userid, username, updatetime } = params;
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs();
        const reimburTask = await models.reimbur_task.findOne({
            where: {
                id: task_id,
                act_user_id: userid,
            },
            raw: true,
            transaction,
        });
        if (!reimburTask) {
            throw new Error("找不到审批任务");
        }
        if (reimburTask.status != 1) {
            throw new Error("该报销已审批过");
        }
        const reimbur = await models.reimbur.findByPk(reimburTask.r_id, {
            transaction,
            raw: true,
        });
        if (!reimbur) {
            throw new Error("找不到报销数据");
        }
        if (reimbur.status != 1) {
            throw new Error("报销流程已结束");
        }
        if (reimbur.updatetime != updatetime) {
            throw new Error("报销数据已被修改，请刷新页面重新查看");
        }
        // 流程定义
        const flowDefine = JSON.parse(reimbur.flow_define);
        // 获取下个任务节点信息
        const newTask = getNextTask(flowDefine, reimbur, reimbur.stage);
        // 更新任务状态
        await models.reimbur_task.update(
            {
                status: 2,
                updatetime: now.unix(),
                remark: remark,
            },
            {
                where: {
                    id: reimburTask.id,
                    act_user_id: userid,
                },
                transaction,
            }
        );
        let updateData = {
            update_by: username,
            updatetime: now.unix(),
        };
        if (newTask) {
            // 说明还有审批任务
            updateData.stage = newTask.id;
            // 删除原本有可能存在的任务(这里是修改好还是删除新建好？)
            await models.reimbur_task.destroy({
                where: {
                    r_id: reimbur.id,
                    stage: newTask.id,
                    act_user_id: newTask.approveUser,
                },
                transaction,
            });
            // 创建新任务
            await models.reimbur_task.create(
                {
                    r_id: reimbur.id,
                    stage: newTask.id,
                    act_user_id: newTask.approveUser,
                    act_user_name: newTask.approveUserName,
                    createtime: now.unix(),
                    updatetime: now.unix(),
                },
                { transaction }
            );
        } else {
            // 报销流程结束了
            updateData.status = 2;
            updateData.stage = "end";
        }
        // 更新报销数据
        await models.reimbur.update(updateData, {
            where: {
                id: reimbur.id,
            },
            transaction,
        });
        // 记录报销流程信息
        await models.reimbur_process.create(
            {
                w_id: reimbur.id,
                userid,
                username,
                flag: 2,
                msg: "同意报销",
                remark,
                time: now.format("YYYY-MM-DD HH:mm:ss"),
                createtime: now.unix(),
            },
            { transaction }
        );
        await transaction.commit();
        // 发送钉钉任务提醒
        let h1 = username + "同意了报销请求";
        if (remark) {
            h1 += "：" + remark;
        }
        const data = {
            userids: [reimbur.applicant],
            totalMoney: reimbur.total_money,
            date: reimbur.date,
            title: "报销审批通过",
            reason: reimbur.reason,
            h1: h1,
        };
        sendMessage(data);
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
};

/**
 * 获取(stage节点的)下一个任务节点
 * @param stage 当前节点
 */
function getNextTask(flowDefine, reimbur, stage) {
    let taskIndex = flowDefine.findIndex((item) => item.id == stage);
    if (taskIndex < 0) {
        throw new Error("流程异常");
    }
    // 查找新任务
    let newTask = flowDefine[taskIndex + 1];
    if (!newTask) {
        return null;
    }
    if (newTask.approveUser) {
        return {
            id: newTask.id,
            approveUser: newTask.approveUser,
            approveUserName: newTask.approveUserName,
        };
    }
    // 金额等级，目前只有阶段 stage-boss 会有金额判断。
    // 例如小于1000无需审批，小于10W某个人审批，其他情况需要老板审批
    const grade = newTask.ext.grade;
    if (!grade || grade.length <= 0) {
        return null;
    }
    let temp = grade.find((item) => {
        return reimbur.total_money >= item.money;
    });
    if (temp) {
        // TODO: 还要处理科目为主营业务支出的情况
        return {
            id: newTask.id,
            approveUser: temp.approveUser,
            approveUserName: temp.approveUserName,
        };
    }
    // 说明找不到符合的金额，则跳过这个审批阶段，直接开始下一个
    return getNextTask(flowDefine, reimbur, newTask.id);
}

/**
 * 驳回
 */
export const reject = async (params) => {
    const { task_id, remark, userid, username, updatetime } = params;
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs();
        const reimburTask = await models.reimbur_task.findOne({
            where: {
                id: task_id,
                act_user_id: userid,
            },
            raw: true,
            transaction,
        });
        if (!reimburTask) {
            throw new Error("找不到审批任务");
        }
        if (reimburTask.status != 1) {
            throw new Error("该报销已审批过");
        }
        const reimbur = await models.reimbur.findByPk(reimburTask.r_id, {
            transaction,
            raw: true,
        });
        if (!reimbur) {
            throw new Error("找不到报销数据");
        }
        if (reimbur.status != 1) {
            throw new Error("报销流程已结束");
        }
        if (reimbur.updatetime != updatetime) {
            throw new Error("报销数据已被修改，请刷新页面重新查看");
        }
        // 更新任务状态
        await models.reimbur_task.update(
            {
                status: 4,
                updatetime: now.unix(),
                remark: remark,
            },
            {
                where: {
                    id: reimburTask.id,
                    act_user_id: userid,
                },
                transaction,
            }
        );
        let updateData = {
            status: 4,
            update_by: username,
            updatetime: now.unix(),
        };
        // 更新报销数据
        await models.reimbur.update(updateData, {
            where: {
                id: reimbur.id,
            },
            transaction,
        });
        // 记录报销流程信息
        await models.reimbur_process.create(
            {
                w_id: reimbur.id,
                userid,
                username,
                flag: 4,
                msg: "报销驳回",
                remark,
                time: now.format("YYYY-MM-DD HH:mm:ss"),
                createtime: now.unix(),
            },
            { transaction }
        );
        await transaction.commit();
        // 发送钉钉任务提醒
        let h1 = `${username}驳回了${reimbur.applicant_name}的报销申请：${remark}`;
        const data = {
            userids: [reimbur.applicant],
            totalMoney: reimbur.total_money,
            date: reimbur.date,
            title: "报销驳回",
            reason: reimbur.reason,
            h1: h1,
        };
        sendMessage(data);
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
};

/**
 * 保存科目
 */
export const saveSubject = async (params) => {
    for (let item of params) {
        await models.reimbur_detail.update(
            {
                subject_id: item.subject_id,
            },
            {
                where: {
                    id: item.id,
                },
            }
        );
    }
};

/**
 * 出纳打款
 */
export const transfer = async (params) => {
    const { bank_account } = params;
    const companyBank = await models.company_bank.findOne({
        where: {
            bank_account,
        },
    });
    if (!companyBank) {
        throw new GlobalError(500, `找不到打款账户【${bank_account}】`);
    }
    if (companyBank.online_pay) {
        // 线上打款
        await onlineTransfer(params);
    } else {
        // 线下打款，表示直接结束
        await agree(params);
    }
};

/**
 * 线上打款，请求财务系统打款，等待银行账单拉取后自动完成报销
 */
async function onlineTransfer(params) {
    const {
        task_id,
        remark,
        userid,
        username,
        updatetime,
        bank_account,
    } = params;
    const transaction = await sequelize.transaction();
    try {
        const now = dayjs();
        const reimburTask = await models.reimbur_task.findOne({
            where: {
                id: task_id,
                act_user_id: userid,
            },
            raw: true,
            transaction,
        });
        if (!reimburTask) {
            throw new Error("找不到审批任务");
        }
        if (reimburTask.status != 1) {
            throw new Error("该报销已审批过");
        }
        const reimbur = await models.reimbur.findByPk(reimburTask.r_id, {
            raw: true,
            transaction,
        });
        if (!reimbur) {
            throw new Error("找不到报销数据");
        }
        if (reimbur.status != 1) {
            throw new Error("报销流程已结束");
        }
        if (reimbur.updatetime != updatetime) {
            throw new Error("报销数据已被修改，请刷新页面重新查看");
        }
        // 更新任务状态
        await models.reimbur_task.update(
            {
                updatetime: now.unix(),
                remark: remark,
            },
            {
                where: {
                    id: reimburTask.id,
                    act_user_id: userid,
                },
                transaction,
            }
        );
        // 更新reimbur时间
        await models.reimbur.update(
            {
                pay_bank_account: bank_account,
                update_by: username,
                updatetime: now.unix(),
            },
            {
                where: {
                    id: reimbur.id,
                },
                transaction,
            }
        );
        // 记录报销流程
        await models.reimbur_process.create(
            {
                w_id: reimbur.id,
                userid,
                username,
                flag: 2,
                msg: "银行转账",
                remark,
                time: now.format("YYYY-MM-DD HH:mm:ss"),
                createtime: now.unix(),
            },
            { transaction }
        );
        // 支付操作需要对接到财务系统
        let res = await SystemService.transaction({
            // 打款账户（公司打钱的银行账户）
            payAccount: bank_account,
            // 收方银行卡号
            toAccount: reimbur.bank_account,
            // 收方户名
            toName: reimbur.payee,
            // 转账金额
            money: reimbur.total_money,
            // 摘要
            summary: remark || "报销款",
            // 收方银行
            bankName: reimbur.bank_name,
            // 收方开户行地址
            bankAddress: reimbur.bank_address,
        });
        global.logger.info("财务转账返回数据：%J", res);
        if (res.code != 1000) {
            throw new Error(res.msg);
        }
        let refext = res.data.orderId;
        await transaction.commit();
        // 更新reimbur的refext
        global.logger.info("更新reimbur的数据：%J", { id: reimbur.id, refext });
        models.reimbur.update(
            {
                refext: refext,
            },
            {
                where: {
                    id: reimbur.id,
                },
            }
        );
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }
}

/**
 * 保存科目
 */
export const saveReceipt = async (params) => {
    for (let item of params) {
        await models.reimbur_detail.update(
            {
                receipt_number: item.receipt_number,
            },
            {
                where: {
                    id: item.id,
                },
            }
        );
    }
};

/**
 * 查询基本信息
 */
export const queryBaseData = async ({ userid }) => {
    return await models.reimbur.findOne({
        attributes: [
            "applicant_dept",
            "payee",
            "bank_name",
            "bank_account",
            "bank_address",
        ],
        where: {
            applicant: userid,
        },
        order: [["createtime", "DESC"]],
        raw: true,
    });
};

/**
 * 完成一个报销，需要银行账单到账才可以，给每日定时任务处理报销单使用
 * @param {string} refext 业务号
 */
export const finishTask = async (refext) => {
    let reimbur = await models.reimbur.findOne({
        where: {
            refext: refext,
            status: 1,
        },
        raw: true,
    });
    if (!reimbur) {
        return;
    }
    let task = await models.reimbur_task.findOne({
        attributes: ["id", "updatetime"],
        where: {
            r_id: reimbur.id,
            stage: reimbur.stage,
            status: 1,
        },
        raw: true,
    });
    if (!task) {
        return;
    }
    const now = dayjs().unix();

    const transaction = await sequelize.transaction();
    try {
        await models.reimbur.update(
            {
                status: 2,
                updatetime: now,
            },
            {
                where: {
                    id: reimbur.id,
                    status: 1,
                },
                transaction,
            }
        );
        await models.reimbur_task.update(
            {
                status: 2,
                updatetime: now,
            },
            {
                where: {
                    id: task.id,
                },
                transaction,
            }
        );
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw new GlobalError(500, error.message);
    }

    // 报销数据核销
    bankBillWriteOff(refext, reimbur, now);
};

/**
 * 银行账单核销
 */
async function bankBillWriteOff(refext, reimbur, now) {
    // 招商银行账单
    let bankBill = await models.bank_bill.findOne({
        where: {
            busref: refext,
            status: 1,
        },
    });
    if (!bankBill) {
        throw new Error(`找不到招商银行账单【${refext}】`);
    }
    const detailList = await models.reimbur_detail.findAll({
        where: {
            r_id: reimbur.id,
        },
    });
    // 报销的内容
    if (reimbur.payment) {
        // ! 买量报销处理
        // // 是否买量，买量需要特殊处理
        // const PAYMENT_SUBJECT_ID = "20010102";
        // let settleId = uuidv4();
        // let settleList = [];
        // settleList.push({
        //     settle_id: settleId,
        //     day: bankBill.day,
        //     bank_bill_id: bankBill.id,
        //     our_account_name: bankBill.account_name,
        //     our_account: bankBill.account,
        //     other_account_name: bankBill.other_account_name,
        //     other_account: bankBill.other_account,
        //     type: 0,
        //     trsamt: bankBill.debit_money,
        //     summary: bankBill.summary,
        //     remark: bankBill.remark,
        //     subject_id: PAYMENT_SUBJECT_ID,
        //     createtime: now,
        // });
        // // 报销明细
        // for (let detail of detailList) {
        //     settleList.push({
        //         settle_id: settleId,
        //         day: detail.start_date + " ~ " + detail.end_date,
        //         order_id: detail.payment_id,
        //         our_account_name: process.env.CBC_BANK_EACNAM,
        //         our_account: process.env.CBC_BANK_EACNBR,
        //         other_account_name: reimbur.payee,
        //         other_account: reimbur.bank_account,
        //         type: 2,
        //         money: detail.money,
        //         subject_id: detail.subject_id,
        //         summary: detail.name,
        //         remark: detail.remark,
        //         createtime: now,
        //     });
        // }
        // const transaction = await sequelize.transaction();
        // try {
        //     let res = await models.bank_bill.update(
        //         {
        //             status: 2,
        //         },
        //         {
        //             where: {
        //                 id: bankBill.id,
        //                 status: 1,
        //             },
        //             transaction,
        //         }
        //     );
        //     if (!res) {
        //         throw new Error("修改招商银行账单状态失败");
        //     }
        //     for (let settle of settleList) {
        //         await models.bank_settle.create(settle, { transaction });
        //     }
        //     // 请求商务系统的结算接口
        //     let settleParams = detailList.map((item) => {
        //         return {
        //             id: item.payment_id,
        //             type: 2,
        //         };
        //     });
        //     res = await SystemService.settlement(settleParams);
        //     if (res.code != 1000) {
        //         throw new Error("商务结算失败");
        //     }
        //     await transaction.commit();
        // } catch (err) {
        //     await transaction.rollback();
        //     throw new Error(err.message);
        // }
    } else {
        let list = detailList.map((detail) => {
            return {
                cb_id: bankBill.cb_id,
                bank_bill_id: bankBill.id,
                day: reimbur.date,
                money: NP.round(NP.times(detail.money, detail.number), 2),
                summary: detail.name,
                remark: detail.remark,
                subject: detail.subject_id,
                createtime: now,
                updatetime: now,
                create_by: "系统自动结算",
                update_by: "系统自动结算",
            };
        });
        await models.bank_bill_detail.bulkCreate(list);
        // 修改招商银行账单状态为已结算
        await models.bank_bill.update(
            {
                status: 3,
            },
            {
                where: {
                    id: bankBill.id,
                },
            }
        );
    }
}

/**
 * 批量发送钉钉提醒
 * @param {*} reimburId 报销ID
 * @param {*} params
 */
async function bulkSendDingtalk(reimburId, params) {
    const { userid } = params;
    const reimbur = await models.reimbur.findByPk(reimburId, {
        attributes: [
            "id",
            "applicant",
            "create_id",
            "total_money",
            "date",
            "reason",
        ],
        raw: true,
    });
    const taskList = await models.reimbur_task.findAll({
        attributes: ["id", "act_user_id"],
        where: {
            r_id: reimburId,
        },
        raw: true,
    });
    const users = [];
    if (reimbur.applicant != userid) {
        users.push(reimbur.applicant);
    }
    if (reimbur.create_id != userid) {
        users.push(reimbur.create_id);
    }
    taskList.forEach((item) => {
        if (item.act_user_id != userid) {
            users.push(item.act_user_id);
        }
    });
    // 发送钉钉任务提醒
    const data = {
        userids: users,
        totalMoney: reimbur.total_money,
        date: reimbur.date,
        title: "报销评论",
        reason: reimbur.reason,
        h1: params.username + "评论：" + params.remark,
    };
    await sendMessage(data);
}

// 报销 钉钉消息发送模板
const MARKDOWN_TEMPLATE = `
# $(h1)

日期：$(date)

报销总金额：$(totalMoney)

报销事由：$(reason)
`;

async function sendMessage({ userids, h1, totalMoney, date, reason, title }) {
    // 根据系统用户ID获取钉钉用户ID
    const data = await PermissionService.getDingtalkIdByUserId(userids);
    const dingtalkUserId = data.map((item) => item.dingding_id).join(",");
    const content = {
        msgtype: "action_card",
        action_card: {
            title,
            markdown: MARKDOWN_TEMPLATE.replace("$(h1)", h1)
                .replace("$(date)", date)
                .replace("$(totalMoney)", totalMoney)
                .replace("$(reason)", reason),
            single_title: "前往查看",
            single_url: "https://reimbur.feigo.fun/#/reimbur/index",
        },
    };
    DingtalkService.sendMsg(dingtalkUserId, content);
}

/**
 * 历史数据迁移（这个别调用）
 */
async function ss() {
    const allData = await models.workflow_instance.findAll({ raw: true });
    const define = await getReimburDefine();
    for (let item of allData) {
        if (item.id < 28) {
            continue;
        }
        // if (item.id > 25) {
        //     break;
        // }
        item.flow_params = JSON.parse(item.flow_params);
        await process(item, define);
        // break;
    }
}

// ss();

/**
 * 报销处理
 */
async function process(instance, define) {
    const transaction = await sequelize.transaction();
    try {
        const flow_define = JSON.parse(JSON.stringify(define));
        flow_define[0].approveUser = instance.flow_params.approve_user;
        flow_define[0].approveUserName = instance.flow_params.approve_user_name;
        let reimbur = {
            date: instance.flow_params.b_date,
            applicant: instance.flow_params.b_user_id,
            applicant_name: instance.flow_params.b_user_name,
            applicant_dept: instance.flow_params.b_dept_id,
            applicant_dept_name: instance.flow_params.b_dept_name,
            stage: instance.cur_node_id,
            status: instance.status,
            flow_define: JSON.stringify(flow_define),
            apply_type: instance.flow_params.apply_type === "正常请款" ? 1 : 2,
            pay_type: 1,
            payee: instance.flow_params.payee,
            bank_name: instance.flow_params.bank_name,
            bank_account: instance.flow_params.bank_account,
            bank_address: instance.flow_params.bank_address,
            total_money: instance.flow_params.total_money,
            refext: instance.refext,
            reason: instance.flow_params.remark || "",
            create_id: instance.flow_params.a_user_id,
            create_by: instance.flow_params.a_user_name,
            create_dept_id: instance.flow_params.a_dept_id,
            create_dept_name: instance.flow_params.a_dept_name,
            createtime: instance.createtime,
            updatetime: instance.updatetime,
            update_by: instance.update_by,
        };
        reimbur = await models.reimbur.create(reimbur, { transaction });
        const detailList = instance.flow_params.detailList.map((item) => {
            return {
                r_id: reimbur.id,
                pd_id: item.id || "",
                name: item.name,
                money: item.money,
                number: item.number,
                unit: item.unit,
                subject_id: item.subject_id,
                remark: item.remark,
                receipt_number: item.receipt_number,
            };
        });
        await models.reimbur_detail.bulkCreate(detailList, { transaction });

        const allTaskList = await models.workflow_task.findAll({
            where: {
                wi_id: instance.id,
            },
            raw: true,
        });
        const taskList = allTaskList.map((item) => {
            let remark = "";
            if (item.params) {
                let p = JSON.parse(item.params);
                remark = p.remark;
            }
            return {
                r_id: reimbur.id,
                stage: item.node_id,
                act_user_id: item.actor_user_id,
                act_user_name: "",
                remark: remark,
                status: item.status,
                createtime: item.createtime,
                updatetime: item.updatetime,
            };
        });
        await models.reimbur_task.bulkCreate(taskList, { transaction });

        await models.reimbur_process.update(
            {
                w_id: reimbur.id,
            },
            {
                where: {
                    w_id: instance.id,
                },
                transaction,
            }
        );

        const copyData = await models.workflow_copy.findOne({
            where: {
                id: instance.id,
            },
            raw: true,
        });
        if (copyData) {
            let temp = JSON.parse(copyData.copys);
            if (temp && temp.length) {
                const arr = temp.map((item) => {
                    return {
                        r_id: reimbur.id,
                        user_id: item.id,
                        user_name: item.user_name,
                        avatar: item.avatar,
                    };
                });
                await models.reimbur_copy.bulkCreate(arr, { transaction });
            }
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        global.logger.error("报销处理异常：%s", error.stack);
    }
}
