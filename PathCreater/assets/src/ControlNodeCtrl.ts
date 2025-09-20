import { _decorator, Component, EventTouch, input, Input, EventKeyboard, KeyCode, Node, CapsuleCharacterController, UITransform, Vec3, animation, Vec2, Camera, EditBox, Prefab, instantiate } from 'cc';
import { AvaterCtrl } from './AvaterCtrl';
import { PathCreateCtr } from './PathCreater';
const { ccclass, property } = _decorator;

let SpeedMax = 8;

@ccclass('ControlNodeCtrl')
export class ControlNodeCtrl extends Component {
    @property(Node)
    public circleNode: Node = null!;

    @property(Node)
    public barNode: Node = null!;

    @property(EditBox)
    public pathCountEditBox: EditBox = null!;

    @property(EditBox)
    public vxEditBox: EditBox = null!;

    @property(EditBox)
    public vzEditBox: EditBox = null!;

    @property(Prefab)
    public itemPrefab:Prefab= null!;

    @property(AvaterCtrl)
    public avaterCtrl: AvaterCtrl = null!;

    @property(PathCreateCtr)
    public pathCreateCtr: PathCreateCtr = null!;

    private circleRadius: number = 0;

    onLoad(): void {
        this.circleRadius = this.circleNode.getComponent(UITransform)!.width / 2;
    }

    start() {
        this.circleNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.circleNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.circleNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.circleNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

    }

    onEnable() {
        this.circleNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.circleNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.circleNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.circleNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }


    private onTouchStart(event: EventTouch) {
        this.onTouchMove(event);
    }

    private onTouchMove(event: EventTouch) {
        // 触摸移动时的处理逻辑
        // 例如根据触摸点移动barNode
        const touch = event.getUILocation();
        const localPos = this.circleNode.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(touch.x, touch.y, 0));
        const distance = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
        if (distance > this.circleRadius) {
            const scale = this.circleRadius / distance;
            localPos.x *= scale;
            localPos.y *= scale;
        }
        this.barNode.setPosition(localPos.x, localPos.y, 0);

        let speedX = (localPos.x / this.circleRadius) * SpeedMax;
        let speedY = (localPos.y / this.circleRadius) * SpeedMax;
        console.log(`SpeedX: ${speedX.toFixed(2)}, SpeedY: ${speedY.toFixed(2)}`);
        this.avaterCtrl.setAvaterXSpeed(speedX);
    }

    private onTouchEnd(event: EventTouch) {
        // 触摸结束时的处理逻辑
        // 通常将barNode重置到中心
        this.barNode.setPosition(0, 0, 0);
        this.avaterCtrl.setAvaterXSpeed(0);
    }

    private onTouchCancel(event: EventTouch) {
        this.onTouchEnd(event);
    }

    onDestroy() {

    }

    update(deltaTime: number) {

    }

    onResetButtonClick() {
        this.avaterCtrl.Reset();
    }

    onStarRunButtonClick() {
        this.avaterCtrl.StartRun();
    }

    onGeneratePathButtonClick() {
        let count = parseInt(this.pathCountEditBox.string);
        this.pathCreateCtr.pointCount = count;
    }

    onGenerateItemButtonClick(){
        let vx = parseFloat(this.vxEditBox.string);
        let vz = parseFloat(this.vzEditBox.string);
        let result = this.pathCreateCtr.putItemByVirtualPosition(instantiate(this.itemPrefab), vx, vz);
        if(!result){
            console.log("放置物体失败，位置不合法");
        }
    }

}

