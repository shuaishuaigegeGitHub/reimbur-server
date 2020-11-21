import Sequelize from "sequelize";

export default (sequelize) => {
    let workflow = sequelize.define(
        "workflow",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            flow_key: {
                type: Sequelize.STRING(50),
                comment: "流程定义码",
            },
            flow_name: {
                type: Sequelize.STRING(50),
                comment: "流程名称",
            },
            flow_define: {
                type: Sequelize.STRING,
                comment: "流程定义（JSON字符串）",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            createby: {
                type: Sequelize.STRING(50),
                comment: "创建者",
            },
        },
        {
            tableName: "workflow",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return workflow;
};
