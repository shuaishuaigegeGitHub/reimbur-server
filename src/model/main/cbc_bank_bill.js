import Sequelize from "sequelize";

export default (sequelize) => {
    let cbc_bank_bill = sequelize.define(
        "cbc_bank_bill",
        {
            id: {
                type: Sequelize.BIGINT(20),
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            actcod: {
                type: Sequelize.STRING(20),
                comment: "账户代码",
            },
            acttyp: {
                type: Sequelize.STRING(30),
                comment: "账户类型",
            },
            eacnam: {
                type: Sequelize.STRING(50),
                comment: "我方户名",
            },
            eacnbr: {
                type: Sequelize.STRING(50),
                comment: "我方账户",
            },
            relacc: {
                type: Sequelize.STRING(50),
                comment: "对方账户",
            },
            relnam: {
                type: Sequelize.STRING(50),
                comment: "对方户名",
            },
            txtclt: {
                type: Sequelize.STRING(100),
                comment: "客户摘要",
            },
            txtbnk: {
                type: Sequelize.STRING(100),
                comment: "银行摘要",
            },
            ccynbr: {
                type: Sequelize.CHAR(2),
                comment: "币种",
            },
            trsref: {
                type: Sequelize.STRING(40),
                comment: "业务参考号",
            },
            trsamt: {
                type: Sequelize.DECIMAL(14, 2),
                comment: "交易金额",
            },
            lgrtyp: {
                type: Sequelize.STRING(20),
                comment: "核算种类",
            },
            brnlgr: {
                type: Sequelize.STRING(20),
                comment: "核算机构",
            },
            trstyp: {
                type: Sequelize.STRING,
                comment: "交易类型。F：金融交易，B：预授权交易，V：透支额度交易",
            },
            trsseq: {
                type: Sequelize.STRING(30),
                comment: "交易流水",
            },
            trsdat: {
                type: Sequelize.STRING(10),
                comment: "记账日期：YYYYMMDD",
            },
            systim: {
                type: Sequelize.STRING(10),
                comment: "系统时间：HHmmss",
            },
            trsdir: {
                type: Sequelize.STRING,
                comment: "记账方向。C：贷（收入），D：借（支出）",
            },
            onlbal: {
                type: Sequelize.DECIMAL(14, 2),
                comment: "余额",
            },
            flwsts: {
                type: Sequelize.STRING,
                comment: "业务结果。A：尚未处理，C：审批拒绝，D：成功，E：失败",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "状态。1：未结算；2：已结算；3：已核销",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
        },
        {
            tableName: "cbc_bank_bill",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return cbc_bank_bill;
};
