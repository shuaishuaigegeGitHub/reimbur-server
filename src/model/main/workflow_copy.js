import Sequelize from  "sequelize";

export default (sequelize) => {
    let workflow_copy = sequelize.define(
        "workflow_copy",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "workflow的ID",
                primaryKey: true, 
                
            },
            copys: {
                type: Sequelize.TEXT,
                comment: "抄送人列表",
                
                
            },
            copy_ids: {
                type: Sequelize.TEXT,
                comment: "抄送人ID列表",
                
                
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
                
                
            },
        },
        {
            tableName: "workflow_copy",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return workflow_copy;
};