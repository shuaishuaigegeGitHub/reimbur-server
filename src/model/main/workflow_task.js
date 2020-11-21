import Sequelize from  "sequelize";

export default (sequelize) => {
    let workflow_task = sequelize.define(
        "workflow_task",
        {
            id: {
                type: Sequelize.BIGINT(20),
                comment: "ID",
                primaryKey: true, 
                autoIncrement: true, 
            },
            wi_id: {
                type: Sequelize.INTEGER,
                comment: "流程实例ID",
                
                
            },
            node_id: {
                type: Sequelize.STRING(30),
                comment: "流程节点ID",
                
                
            },
            task_name: {
                type: Sequelize.STRING(50),
                comment: "任务名称",
                
                
            },
            actor_user_id: {
                type: Sequelize.INTEGER,
                comment: "执行用户ID",
                
                
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "任务状态。1：进行中，2：已完成，3：已取消，4：已驳回",
                
                
            },
            params: {
                type: Sequelize.MEDIUMTEXT,
                comment: "参数",
                
                
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
            tableName: "workflow_task",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return workflow_task;
};