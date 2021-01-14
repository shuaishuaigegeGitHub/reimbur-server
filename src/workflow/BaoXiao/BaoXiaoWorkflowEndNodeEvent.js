import WorkflowEndNodeEvent from "../event/WorkflowEndNodeEvent";
import * as DingtalkService from "@/service/DingtalkService";
import * as PermissionService from "@/service/PermissionService";

// 报销 钉钉消息发送模板
const MARKDOWN_TEMPLATE = `
# $(h1)

申请时间：$(date)

报销总金额：$(totalMoney)

备注：$(remark)
`;

/**
 * 报销流程结束事件
 */
export default class BaoXiaoWorkflowEndNodeEvent extends WorkflowEndNodeEvent {
    /**
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async onEvent(workflowInstance, nodeModel, workflowParam) {
        global.logger.info("报销流程结束事件");
        // 发送给申请者钉钉消息提醒
        await this.sendMessage({
            userids: [workflowInstance.applicant],
            h1: "报销申请已通过",
            totalMoney: workflowInstance.flow_params.total_money,
            date: workflowInstance.flow_params.b_date,
            remark: workflowInstance.flow_params.remark,
        });
        // 发给抄送人消息
        let copys = workflowInstance.flow_params.copys || [];
        if (copys.length) {
            // 有抄送人
            copys = copys.map((item) => item.id);
            await this.sendMessage({
                userids: copys,
                h1: `${workflowInstance.flow_params.b_user_name}抄送给你的的报销申请`,
                title: "报销抄送",
                totalMoney: workflowInstance.flow_params.total_money,
                date: workflowInstance.flow_params.b_date,
                remark: workflowInstance.flow_params.remark,
            });
        }
    }

    /**
     * 发送钉钉消息提醒
     */
    async sendMessage({
        userids,
        h1,
        totalMoney,
        date,
        remark,
        title = "报销审批",
    }) {
        // 根据系统用户ID获取钉钉用户ID
        const data = await PermissionService.getDingtalkIdByUserId(userids);
        const dingtalkUserId = data.map((item) => item.dingding_id).join(",");
        const content = {
            msgtype: "action_card",
            action_card: {
                title,
                markdown: MARKDOWN_TEMPLATE.replace("$(h1)", h1)
                    .replace("$(date)", date)
                    .replace("$(totalMoney)", totalMoney)
                    .replace("$(remark)", remark),
                single_title: "前往查看",
                single_url: "https://reimbur.feigo.fun/#/reimbur/index",
            },
        };
        DingtalkService.sendMsg(dingtalkUserId, content);
    }
}
