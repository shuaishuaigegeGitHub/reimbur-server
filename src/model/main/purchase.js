import Sequelize from "sequelize";

export default (sequelize) => {
    // 采购表
    let purchase = sequelize.define(
        "purchase",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            applicant: {
                type: Sequelize.INTEGER,
                comment: "申请人ID",
            },
            applicant_name: {
                type: Sequelize.STRING(50),
                comment: "申请人",
            },
            date: {
                type: Sequelize.STRING(10),
                comment: "期望交付日期",
            },
            reasons: {
                type: Sequelize.STRING(255),
                comment: "采购事由",
            },
            detail: {
                type: Sequelize.TEXT,
                comment: "采购明细",
            },
            approvers: {
                type: Sequelize.STRING,
                comment: "审批人列表",
            },
            images: {
                type: Sequelize.STRING,
                comment: "审批人列表",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "状态。1：进行中，2：已结束，3：已取消，4：已驳回",
            },
            remark: {
                type: Sequelize.STRING,
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
            update_by: {
                type: Sequelize.STRING(50),
                comment: "更新者",
            },
        },
        {
            tableName: "purchase",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return purchase;
};
