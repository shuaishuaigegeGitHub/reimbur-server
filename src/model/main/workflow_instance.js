import Sequelize from "sequelize";

export default (sequelize) => {
    let workflow_instance = sequelize.define(
        "workflow_instance",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            flow_key: {
                type: Sequelize.STRING(50),
                comment: "流程定义编码",
            },
            cur_node_id: {
                type: Sequelize.STRING(30),
                comment: "当前节点ID",
            },
            next_node_id: {
                type: Sequelize.STRING(30),
                comment: "下一节点ID",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "状态。1：开始，2：结束，3：取消，4：驳回",
            },
            flow_params: {
                type: Sequelize.STRING,
                comment: "流程参数（创建者申请时，提交的参数）",
            },
            flow_define: {
                type: Sequelize.STRING,
                comment: "流程定义（实例保存一份，如果原流程定义修改，已经有的就按照现有的来执行）",
            },
            applicant: {
                type: Sequelize.INTEGER,
                comment: "申请者ID",
            },
            refext: {
                type: Sequelize.STRING(50),
                comment: "招商银行业务参考号。存在该业务参考号表示已经转账了。",
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
                comment: "最后一次的操作者",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "最后修改时间",
            },
        },
        {
            tableName: "workflow_instance",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return workflow_instance;
};
