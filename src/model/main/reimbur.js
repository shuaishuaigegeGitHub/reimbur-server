import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur = sequelize.define(
        "reimbur",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            p_id: {
                type: Sequelize.INTEGER,
                comment: "采购ID（关联采购单）",
            },
            date: {
                type: Sequelize.STRING(0),
                comment: "日期",
            },
            applicant: {
                type: Sequelize.INTEGER,
                comment: "申请人ID",
            },
            applicant_name: {
                type: Sequelize.STRING(50),
                comment: "申请人",
            },
            applicant_dept: {
                type: Sequelize.INTEGER,
                comment: "申请人部门ID",
            },
            applicant_dept_name: {
                type: Sequelize.STRING(50),
                comment: "申请人部门",
            },
            stage: {
                type: Sequelize.STRING(20),
                comment: "当前审批阶段",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "状态。1：开始，2：结束，3：取消，4：驳回",
            },
            flow_define: {
                type: Sequelize.TEXT,
                comment: "流程定义",
            },
            apply_type: {
                type: Sequelize.TINYINT(4),
                comment: "申请类型，1：正常情况，2：预付请款",
            },
            pay_type: {
                type: Sequelize.TINYINT(4),
                comment: "付款类型，1：银行转账",
            },
            payee: {
                type: Sequelize.STRING(100),
                comment: "收款单位",
            },
            bank_name: {
                type: Sequelize.STRING(50),
                comment: "开户行",
            },
            bank_account: {
                type: Sequelize.STRING(60),
                comment: "银行账号",
            },
            bank_address: {
                type: Sequelize.STRING(100),
                comment: "开户地",
            },
            total_money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "报销总金额",
            },
            refext: {
                type: Sequelize.STRING(50),
                comment:
                    "招商银行业务参考号。存在该业务参考号表示已经转账了（但不一定到账）",
            },
            reason: {
                type: Sequelize.STRING(255),
                comment: "报销事由",
            },
            create_id: {
                type: Sequelize.INTEGER,
                comment: "创建者ID",
            },
            create_dept_id: {
                type: Sequelize.INTEGER,
                comment: "创建者部门ID",
            },
            create_dept_name: {
                type: Sequelize.STRING(50),
                comment: "创建者部门",
            },
            create_by: {
                type: Sequelize.STRING(50),
                comment: "创建者",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            update_by: {
                type: Sequelize.STRING(50),
                comment: "最近一次操作人",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "最近一次操作时间",
            },
        },
        {
            tableName: "reimbur",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return reimbur;
};
