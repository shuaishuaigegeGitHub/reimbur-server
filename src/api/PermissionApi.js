import Router from "koa-router";
import * as PermissionService from "@/service/PermissionService";

const router = new Router({
    prefix: "/permission",
});

/**
 * 获取其他系统信息
 */
router.get("/system", async (ctx) => {
    const data = await PermissionService.getSystem(ctx.header.token);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 获取当前用户信息
 */
router.get("/userinfo", async (ctx) => {
    ctx.renderJson({ msg: "查询成功", data: ctx.state });
});

/**
 * 获取所有用户数据
 */
router.get("/users", async (ctx) => {
    const data = await PermissionService.getUsers(ctx.header.token);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 获取所有部门数据
 */
router.get("/depts", async (ctx) => {
    const data = await PermissionService.getDepts();
    ctx.renderJson({ msg: "查询成功", data });
});

export default router;
