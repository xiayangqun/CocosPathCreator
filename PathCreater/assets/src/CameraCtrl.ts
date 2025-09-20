import { _decorator, Component, Node, input, Input, EventTouch, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraCtrl')
export class CameraCtrl extends Component {

    @property(Node)
    public target: Node = null!;

    @property({ tooltip: '摄像机注视点相对target的偏移' })
    public targetOffset: Vec3 = new Vec3(0, 1.0, 0);

    @property({ tooltip: '摄像机注视点左右偏移，负值偏左，正值偏右（单位：米）' })
    public horizontalOffset: number = -1.0;

    @property({ tooltip: '摄像机跟随target转向的阻尼系数，值越小跟随越慢' })
    public rotationDamping: number = 2.0;

    // 环绕参数
    private _radius: number = 5;
    private _yaw: number = 0; // 水平角度
    private _pitch: number = 20 * Math.PI / 180; // 俯仰角，初始20度
    private _targetYaw: number = 0; // target的目标朝向角度
    private _lastTargetRotation: number = 0; // 上一帧target的旋转角度
    private _touching: boolean = false;
    private _lastTouchX: number = 0;
    private _lastTouchY: number = 0;
    private _rotateSpeed: number = 0.5; // 水平旋转灵敏度
    private _pitchSpeed: number = 0.5; // 俯仰旋转灵敏度
    private _minPitch: number = -70 * Math.PI / 180; // 最小仰角-70度
    private _maxPitch: number = 70 * Math.PI / 180; // 最大仰角70度


    start() {
        if (!this.target) {
            console.error("CameraCtrl: target is not assigned.");
            return;
        }

        // 监听全局触摸事件
        // input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        // input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        // input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        // input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        // 初始化角度和半径
        const cameraPos = this.node.getWorldPosition();
        // 计算带有水平偏移的注视点
        let targetPos = this.target.getWorldPosition().add(this.targetOffset);
        // 计算摄像机右方向
        const right = new Vec3(Math.cos(this._yaw), 0, -Math.sin(this._yaw));
        targetPos = targetPos.add(right.multiplyScalar(this.horizontalOffset));
        const offset = cameraPos.subtract(targetPos);
        this._radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
        this._yaw = Math.atan2(offset.x, offset.z);
        // 计算pitch
        const dy = cameraPos.y - targetPos.y;
        this._pitch = Math.atan2(dy, Math.sqrt(offset.x * offset.x + offset.z * offset.z));
        // 限制pitch范围
        this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch));
        
        // 初始化target的旋转角度
        this._lastTargetRotation = this.target.eulerAngles.y * Math.PI / 180;
        this._targetYaw = this._yaw;
    }

    update(deltaTime: number) {
        if (!this.target) return;
        
        // 获取target当前的旋转角度（Y轴）
        const currentTargetRotation = this.target.eulerAngles.y * Math.PI / 180;
        
        // 计算target的旋转变化
        let rotationDelta = currentTargetRotation - this._lastTargetRotation;
        
        // 处理角度跨越-180到180度的情况
        if (rotationDelta > Math.PI) {
            rotationDelta -= 2 * Math.PI;
        } else if (rotationDelta < -Math.PI) {
            rotationDelta += 2 * Math.PI;
        }
        
        // 更新目标yaw角度
        this._targetYaw += rotationDelta;
        
        // 使用阻尼平滑插值到目标角度
        const yawDiff = this._targetYaw - this._yaw;
        let adjustedYawDiff = yawDiff;
        
        // 处理角度跨越-180到180度的情况
        if (adjustedYawDiff > Math.PI) {
            adjustedYawDiff -= 2 * Math.PI;
        } else if (adjustedYawDiff < -Math.PI) {
            adjustedYawDiff += 2 * Math.PI;
        }
        
        // 应用阻尼
        this._yaw += adjustedYawDiff * this.rotationDamping * deltaTime;
        
        // 更新上一帧的target旋转角度
        this._lastTargetRotation = currentTargetRotation;
        
        // 计算摄像机新位置（球坐标转直角坐标）
        // 计算带有水平偏移的注视点
        let targetPos = this.target.getWorldPosition().add(this.targetOffset);
        const right = new Vec3(Math.cos(this._yaw), 0, -Math.sin(this._yaw));
        targetPos = targetPos.add(right.multiplyScalar(this.horizontalOffset));
        const r = this._radius;
        const pitch = this._pitch;
        const yaw = this._yaw;
        const x = targetPos.x + r * Math.sin(yaw) * Math.cos(pitch);
        const y = targetPos.y + r * Math.sin(pitch);
        const z = targetPos.z + r * Math.cos(yaw) * Math.cos(pitch);
        this.node.setWorldPosition(x, y, z);
        this.node.lookAt(targetPos);
    }

    // onTouchStart(event: EventTouch) {
    //     this._touching = true;
    //     this._lastTouchX = event.getLocationX();
    //     this._lastTouchY = event.getLocationY();
    // }

    // onTouchMove(event: EventTouch) {
    //     if (!this._touching) return;
    //     const curX = event.getLocationX();
    //     const curY = event.getLocationY();
    //     const dx = this._lastTouchX - curX;
    //     const dy = this._lastTouchY - curY;
    //     this._lastTouchX = curX;
    //     this._lastTouchY = curY;
    //     // 根据滑动距离调整角度
    //     this._yaw += dx * this._rotateSpeed * 0.01;
    //     this._pitch += dy * this._pitchSpeed * 0.01;
    //     // 限制pitch范围
    //     this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch));
    // }

    // onTouchEnd(event: EventTouch) {
    //     this._touching = false;
    //     // 触摸结束时，重新同步目标yaw角度，以便平滑过渡到自动跟随状态
    //     this._targetYaw = this._yaw;
    // }

    onDestroy() {
        // input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        // input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        // input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        // input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}

