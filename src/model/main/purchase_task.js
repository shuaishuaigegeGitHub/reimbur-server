import Sequelize from "sequelize";

export default (sequelize) => {
    // 采购任务表
    let purchase_task = sequelize.define(
        "purchase_task",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            p_id: {
                type: Sequelize.INTEGER,
                comment: "采购ID(purchase表的id)",
            },
            stage: {
                type: Sequelize.TINYINT(4),
                comment: "阶段",
            },
            actor_user_id: {
                type: Sequelize.INTEGER,
                comment: "执行用户ID",
            },
            actor_user_name: {
                type: Sequelize.STRING(50),
                comment: "执行用户名称",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "状态。1：进行中，2：已完成，3：已取消，4：已驳回",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "更新时间",
            },
        },
        {
            tableName: "purchase_task",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return purchase_task;
};
