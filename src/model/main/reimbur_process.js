import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur_process = sequelize.define(
        "reimbur_process",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            w_id: {
                type: Sequelize.INTEGER,
                comment: "报销流程ID",
            },
            userid: {
                type: Sequelize.INTEGER,
                comment: "操作者用户ID",
            },
            username: {
                type: Sequelize.STRING(50),
                comment: "操作者名称",
            },
            flag: {
                type: Sequelize.TINYINT(4),
                comment:
                    "标志：1、正常（发起，结束）、2、进行中，3：取消，4、驳回",
            },
            msg: {
                type: Sequelize.STRING(255),
                comment: "操作信息",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            time: {
                type: Sequelize.STRING(20),
                comment: "操作时间",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
        },
        {
            tableName: "reimbur_process",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return reimbur_process;
};
