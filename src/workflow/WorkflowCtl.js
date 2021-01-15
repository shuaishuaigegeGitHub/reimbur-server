import nodeParser from "./parser/nodeParser";
import sequelize from "@/model/index";
import GlobalError from "@/common/GlobalError";
import dayjs from "dayjs";
import {
    WORKFLOW_INSTANCE_STATUS_START,
    WORKFLOW_INSTANCE_STATUS_REJECT,
    WORKFLOW_TASK_STATUS_START,
    WORKFLOW_TASK_STATUS_END,
    WORKFLOW_TASK_STATUS_CANCEL,
    WORKFLOW_TASK_STATUS_REJECT,
    WORKFLOW_INSTANCE_STATUS_END,
} from "./WorkflowConstant";
import WorkflowNodeProcessorCtl from "./processor/WorkflowNodeProcessorCtl";

const { models } = sequelize;

/**
 * 生成报销NO
 * 生成规则：FLBR + 时间(201211) + 三位数字(从1开始，创建一个报销NO+1，预计一天最多999个报销，如果多出来，则这里生成会有问题)
 */
async function generatorNo() {
    let financialConfig = await models.financial_config.findOne({
        where: {
            name: "baoxiao_no",
        },
        raw: true,
    });
    let value = financialConfig.value;
    // value自增
    models.financial_config.update(
        {
            value: value + 1,
        },
        {
            where: {
                name: "baoxiao_no",
            },
        }
    );
    let result = "FLRB" + dayjs().format("YYMMDD") + fillPrefixZero(value, 3);
    return result;
}

/**
 * 指定长度数字前缀补0
 * @param {int} num
 * @param {int} length 长度
 */
function fillPrefixZero(num, length) {
    return (Array(length).join("0") + num).slice(-length);
}

/**
 * 流程引擎控制
 */
export default class WorkflowCtl {
    /**
     * @param {WorkflowNodeProcessorCtl} workflowNodeProcessorCtl
     */
    constructor(workflowNodeProcessorCtl) {
        if (!(workflowNodeProcessorCtl instanceof WorkflowNodeProcessorCtl)) {
            throw new GlobalError(
                600,
                `${WorkflowCtl.name} 需要处理器 ${WorkflowNodeProcessorCtl.name}`
            );
        }
        this.workflowNodeProcessorCtl = workflowNodeProcessorCtl;
    }

    /**
     * 启动一个流程
     * @param {string} flowKey 工作流定义码
     * @param {object} workflowParam 实例参数
     * @param {string} operator 操作者
     * @param {number} applicant 申请者用户ID
     */
    async startProcess(flowKey, workflowParam, operator, applicant) {
        global.logger.debug("[%s]启动流程--[%s]", operator, flowKey);
        if (!workflowParam && typeof workflowParam !== "object") {
            throw new GlobalError(600, "缺少流程实例参数");
        }
        // 1.根据流程定义解析出流程节点
        const workflow = await models.workflow.findOne({
            where: {
                flow_key: flowKey,
            },
            raw: true,
        });
        if (!workflow) {
            throw new GlobalError(600, `流程[${flowKey}]不存在！`);
        }
        global.logger.debug("解析[%s]流程定义", flowKey);
        // 流程模型，见 app/workflow/model/WorkflowModel.js
        const workflowModel = nodeParser(workflow);

        // 获取开始节点
        const startModel = workflowModel.getStartModel();

        // 2.创建新流程实例
        global.logger.debug("创建[%s]流程实例", flowKey);
        const now = dayjs().unix();
        const workflowInstance = {
            flow_key: workflow.flow_key,
            cur_node_id: startModel.id,
            next_node_id: startModel.nextNodeId,
            status: WORKFLOW_INSTANCE_STATUS_START,
            flow_params: JSON.stringify(workflowParam),
            flow_define: workflow.flow_define,
            applicant: applicant,
            create_by: operator,
            update_by: operator,
            createtime: now,
            updatetime: now,
        };
        let instance = await models.workflow_instance.create(workflowInstance, {
            raw: true,
        });

        // 3.执行开始节点
        global.logger.debug("执行开始节点");
        instance.flow_params = JSON.parse(instance.flow_params);
        await this.workflowNodeProcessorCtl.process(
            instance,
            workflowModel,
            startModel,
            workflowParam
        );
        // 返回新流程实例
        return instance;
    }

    /**
     * 完成一个流程任务
     * @param {number} workflowTaskId 流程任务ID
     * @param {string} operator 操作者
     * @param {object} workflowParam 参数
     */
    async completeTask(workflowTaskId, operator, params) {
        const workflowTask = await models.workflow_task.findByPk(
            workflowTaskId
        );
        if (!workflowTask) {
            throw new GlobalError(600, "找不到对应的流程任务");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_END) {
            throw new GlobalError(600, "该任务已被完成");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_CANCEL) {
            throw new GlobalError(600, "该任务已被取消");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_REJECT) {
            throw new GlobalError(600, "该任务已被驳回");
        }
        global.logger.debug(
            "[%s]完成流程任务--[%s]",
            operator,
            workflowTask.task_name
        );
        const workflowInstance = await models.workflow_instance.findByPk(
            workflowTask.wi_id
        );
        if (!workflowInstance) {
            throw new GlobalError(600, "找不到对应的流程实例");
        }
        // 修改流程流程对应的所有流程节点任务状态。
        global.logger.debug(
            "更新流程实例[%d]对应节点[%s]的任务状态为已完成",
            workflowInstance.id,
            workflowTask.node_id
        );
        params.operator = operator;
        const transaction = await sequelize.transaction();
        try {
            const now = dayjs().unix();
            await models.workflow_task.update(
                {
                    status: WORKFLOW_INSTANCE_STATUS_END,
                    params: JSON.stringify(params),
                    updatetime: now,
                },
                {
                    where: {
                        wi_id: workflowTask.wi_id,
                        status: WORKFLOW_TASK_STATUS_START,
                        node_id: workflowTask.node_id,
                    },
                    transaction,
                }
            );
            // 修改流程实例的更新时间，最后操作者
            await models.workflow_instance.update(
                {
                    updatetime: now,
                    update_by: operator,
                },
                {
                    where: {
                        id: workflowTask.wi_id,
                        status: WORKFLOW_INSTANCE_STATUS_START,
                    },
                    transaction,
                }
            );
            // 解析流程模型，见 app/workflow/model/WorkflowModel.js
            await transaction.commit();
        } catch (err) {
            global.logger.error("完成流程出错：%s", err.stack);
            await transaction.rollback();
            throw new GlobalError(600, err.message);
        }
        const workflowModel = nodeParser(workflowInstance);
        workflowInstance.flow_params = JSON.parse(workflowInstance.flow_params);
        const curNode = workflowModel.getNodeModel(workflowTask.node_id);
        await this.workflowNodeProcessorCtl.process(
            workflowInstance,
            workflowModel,
            workflowModel.getNodeModel(curNode.nextNodeId),
            params
        );
    }

    /**
     * 驳回一个流程任务
     * 驳回后只能重新开启一个流程实例
     * @param {number} workflowTaskId 流程任务ID
     * @param {string} operator 操作者
     * @param {object} workflowParam 实例参数
     */
    async rejectTask(workflowTaskId, operator, params) {
        const workflowTask = await models.workflow_task.findByPk(
            workflowTaskId
        );
        if (!workflowTask) {
            throw new GlobalError(600, "找不到对应的流程任务");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_END) {
            throw new GlobalError(600, "该任务已被完成");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_CANCEL) {
            throw new GlobalError(600, "该任务已被取消");
        }
        if (workflowTask.status === WORKFLOW_TASK_STATUS_REJECT) {
            throw new GlobalError(600, "该任务已被驳回");
        }
        global.logger.debug(
            "[%s]驳回流程任务--[%s]",
            operator,
            workflowTask.task_name
        );
        const workflowInstance = await models.workflow_instance.findByPk(
            workflowTask.wi_id
        );
        if (!workflowInstance) {
            throw new GlobalError(600, "找不到对应的流程实例");
        }
        // 修改流程流程对应的所有流程节点任务状态。
        global.logger.debug(
            "更新流程实例[%d]对应节点[%s]的任务状态为驳回",
            workflowInstance.id,
            workflowTask.node_id
        );
        const transaction = await sequelize.transaction();
        try {
            const now = dayjs().unix();
            let res = await models.workflow_task.update(
                {
                    status: WORKFLOW_INSTANCE_STATUS_REJECT,
                    params: JSON.stringify(params),
                    updatetime: now,
                },
                {
                    where: {
                        wi_id: workflowTask.wi_id,
                        status: WORKFLOW_TASK_STATUS_START,
                        node_id: workflowTask.node_id,
                    },
                    transaction,
                }
            );
            if (!res) {
                throw new Error("修改流程任务状态为驳回失败");
            }
            // 修改任务实例状态为驳回
            res = await models.workflow_instance.update(
                {
                    status: WORKFLOW_TASK_STATUS_REJECT,
                    update_by: operator,
                    updatetime: now,
                },
                {
                    where: {
                        id: workflowInstance.id,
                    },
                    transaction,
                }
            );
            if (!res) {
                throw new Error("修改流程实例状态为驳回失败");
            }
            await transaction.commit();
        } catch (err) {
            global.logger.error("修改驳回状态失败：%s", err.stack);
            await transaction.rollback();
            throw new GlobalError(600, "驳回失败，请刷新页面重试");
        }
    }
}
