import UserService from "../service/UserService";
import GlobalError from "@/common/GlobalError";

export default class BaoXiaoUserService extends UserService {
    /**
     * 报销流程-查询任务执行者
     * @param {object} workflowInstance 流程实例
     * @param {TaskModel} nodeModel 任务节点模型
     * @param {object} workflowParam 流程实例参数
     */
    async queryTaskPerformer(workflowInstance, nodeModel, workflowParam) {
        global.logger.debug("查询任务[%s]的审批人", nodeModel.name);
        const approveUser = nodeModel.approveUser || workflowParam.approve_user;
        if (approveUser) {
            return [approveUser];
        }
        throw new GlobalError(600, `[${nodeModel.name}]找不到审批人`);
    }
}
