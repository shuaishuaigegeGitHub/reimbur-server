import WorkflowNodeProcessor from "./WorkflowNodeProcessor";
import { TASK_NODE_TYPE } from "../WorkflowConstant";
import dayjs from "dayjs";
import sequelize from "@/model/index";
import WorkflowTaskNodeEvent from "../event/WorkflowTaskNodeEvent";
import WorkflowTaskCreatedEvent from "../event/WorkflowTaskCreatedEvent";
import UserService from "../service/UserService";

const { models } = sequelize;

/**
 * 任务节点处理器
 */
export default class TaskNodeProcessor extends WorkflowNodeProcessor {
    constructor(taskNodeEvent, taskCreatedEvent, userService) {
        super();
        if (!(taskNodeEvent instanceof WorkflowTaskNodeEvent)) {
            throw new GlobalError(600, `${TaskNodeProcessor.name} 需要事件 ${WorkflowTaskNodeEvent.name}`);
        }
        if (!(taskCreatedEvent instanceof WorkflowTaskCreatedEvent)) {
            throw new GlobalError(600, `${TaskNodeProcessor.name} 需要事件 ${WorkflowTaskCreatedEvent.name}`);
        }
        if (!(userService instanceof UserService)) {
            throw new GlobalError(600, `${TaskNodeProcessor.name} 需要服务 ${UserService.name}`);
        }
        this.nodeType = TASK_NODE_TYPE;
        this.taskNodeEvent = taskNodeEvent;
        this.taskCreatedEvent = taskCreatedEvent;
        this.userService = userService;
    }

    /**
     * 流程任务节点处理方法
     * @param {object} workflowInstance 流程实例
     * @param {object} workflowModel 流程模型
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async process(workflowInstance, workflowModel, nodeModel, workflowParam) {
        await this.createTask(workflowInstance, nodeModel, workflowParam);
        await this.taskNodeEvent.onEvent(workflowInstance, nodeModel, workflowParam);
    }

    /**
     * 创建任务
     * @param {object} workflowInstance 流程实例
     * @param {object} nodeModel 节点模型
     * @param {object} workflowParam 流程参数
     */
    async createTask(workflowInstance, nodeModel, workflowParam) {
        global.logger.debug("创建任务[%s]", nodeModel.name);
        // 获取任务参与者（审批人）
        const userIds = await this.userService.queryTaskPerformer(workflowInstance, nodeModel, workflowParam);
        const now = dayjs().unix();
        // 流程任务
        const workflowTask = {
            // 对应的流程实例ID
            wi_id: workflowInstance.id,
            // 对应任务节点的ID
            node_id: nodeModel.id,
            // 对应的任务名称
            task_name: nodeModel.name,
            createtime: now,
            updatetime: now,
        };

        let task = null;
        for (let userId of userIds) {
            task = Object.assign({}, workflowTask);
            task.actor_user_id = userId;
            await models.workflow_task.create(task);
            await this.taskCreatedEvent.onEvent(workflowInstance, nodeModel, workflowParam);
        }
        return userIds.length;
    }
}
