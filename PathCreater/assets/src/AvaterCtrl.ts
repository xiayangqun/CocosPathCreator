import { _decorator, Component, Node, Quat, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AvaterCtrl')
export class AvaterCtrl extends Component {

    @property(Node)
    public avaterAniNode: Node = null!;

    @property(Node)
    public avaterRootNode: Node = null!;

    @property(Node)
    public pathPointContainer: Node = null!;

    private isRuning: boolean = false;

    private curPathPointIndex: number = 0;

    private curSubPathLength: number = 0;

    private targetForward: Vec3 = new Vec3();

    private moveDirection: Vec3 = new Vec3();

    private avaterSpeedX: number = 0;

    public Reset() {
        this.isRuning = false;
        this.curPathPointIndex = 0;
        this.avaterAniNode.position = Vec3.ZERO;
        this.avaterRootNode.position = Vec3.ZERO;
        this.avaterRootNode.setRotation(Quat.fromEuler(new Quat, 0, 0, 0));
        this.moveDirection.set(0, 0, 0);
    }

    public StartRun() {
        this.isRuning = true;
        this.updateRotationAndDirection(this.curPathPointIndex);
    }

    public update(dt: number): void {
        if (this.isRuning) {

            //计算位置
            let speed = 3
            let nextPos = Vec3.scaleAndAdd(new Vec3(), this.avaterRootNode.worldPosition, this.moveDirection, dt * speed);
            let currentCumulative = Vec3.distance(this.pathPointContainer.children[this.curPathPointIndex].worldPosition, nextPos);
            if (currentCumulative >= this.curSubPathLength) {
                //已经达到下个路径点了。
                let nextPathPointIndex = this.curPathPointIndex + 1;
                if (nextPathPointIndex >= this.pathPointContainer.children.length - 1) {
                    //没有下个子路径线段了
                    this.isRuning = false;
                }
                else {
                    this.curPathPointIndex = nextPathPointIndex;
                    // this.avaterRootNode.worldPosition = this.pathPointContainer.children[this.curPathPointIndex].worldPosition;
                    this.avaterRootNode.worldPosition = nextPos;
                    this.updateRotationAndDirection(this.curPathPointIndex);
                }
            }
            else {
                this.avaterRootNode.worldPosition = nextPos;
            }

            //计算朝向
            let curForward = this.avaterRootNode.forward;
            let forwardSpeed = 5;
            // 计算目标朝向的旋转四元数
            let currentRot = this.avaterRootNode.rotation;
            let targetRot = new Quat();
            Quat.fromViewUp(targetRot,
                new Vec3(-this.targetForward.x, -this.targetForward.y, -this.targetForward.z),
                Vec3.UP);

            // 使用球面插值平滑转向
            let slerpRot = new Quat();
            Quat.slerp(slerpRot, currentRot, targetRot, Math.min(1, forwardSpeed * dt));
            this.avaterRootNode.setRotation(slerpRot);


            //计算横向移动
            
            if (this.avaterSpeedX != 0) {
                let limit = 2.0;
                let offset = this.avaterSpeedX * dt * 0.3;
                let position = new Vec3(this.avaterAniNode.position);
                position.x += offset;
                if(position.x > limit){
                    position.x = limit;
                }
                if(position.x < -limit){
                    position.x = -limit;
                }
                this.avaterAniNode.setPosition(position);
            }
        }
    }

    private updateRotationAndDirection(pathPointIndex: number): boolean {
        let nextPathPointIndex = pathPointIndex + 1;
        let curPathPoint = this.pathPointContainer.children[pathPointIndex];
        let nextPathPoint = this.pathPointContainer.children[nextPathPointIndex];
        let curWorldPos = curPathPoint.worldPosition;
        let nextWorldPos = nextPathPoint.worldPosition;

        Vec3.subtract(this.moveDirection, nextWorldPos, curWorldPos);
        this.curSubPathLength = this.moveDirection.length();
        this.moveDirection.normalize();
        this.targetForward.set(this.moveDirection);
        // this.targetForward.y = 0;
        this.targetForward.normalize();
        return true;
    }

    public setAvaterXSpeed(xSpeed: number) {
        this.avaterSpeedX = xSpeed;
    }


}

