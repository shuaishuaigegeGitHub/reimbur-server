import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur_task = sequelize.define(
        "reimbur_task",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            r_id: {
                type: Sequelize.INTEGER,
                comment: "报销ID",
            },
            stage: {
                type: Sequelize.STRING(20),
                comment: "阶段",
            },
            act_user_id: {
                type: Sequelize.INTEGER,
                comment: "审批人ID",
            },
            act_user_name: {
                type: Sequelize.STRING(50),
                comment: "审批人",
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
                comment: "最后更新时间",
            },
        },
        {
            tableName: "reimbur_task",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return reimbur_task;
};
