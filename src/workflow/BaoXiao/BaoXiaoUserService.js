import UserService from "../service/UserService";
import GlobalError from "@/common/GlobalError";

export default class BaoXiaoUserService extends UserService {
    /**
     * 报销流程-查询任务执行者
     * 如果金额超过10W，并且不是主营业务支出，那么需要另外一个人来审批
     * @param {object} workflowInstance 流程实例
     * @param {TaskModel} nodeModel 任务节点模型
     * @param {object} workflowParam 流程实例参数
     */
    async queryTaskPerformer(workflowInstance, nodeModel, workflowParam) {
        global.logger.debug("查询任务[%s]的审批人", nodeModel.name);
        const flowParams = workflowInstance.flow_params;
        let approveUser = nodeModel.approveUser || flowParams.approve_user;
        if (
            nodeModel.ext.money &&
            flowParams.total_money >= nodeModel.ext.money
        ) {
            // 超过限制金额则需要换个人审批
            // 查找是否有非主营业务的报销明细
            const exists = flowParams.detailList.find(
                (item) => !item.subject_id.startsWith(nodeModel.ext.subject)
            );
            if (exists) {
                // 科目不是主营业务成本的就需要换人来审批
                approveUser = nodeModel.ext.otherApproveUser;
            }
        }
        if (approveUser) {
            return [approveUser];
        }
        throw new GlobalError(600, `[${nodeModel.name}]找不到审批人`);
    }
}
