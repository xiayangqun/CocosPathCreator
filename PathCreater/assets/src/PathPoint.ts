import { _decorator, Color, Component, Node, Vec3 } from 'cc';
import { drawCube, drawLineFromTo } from './DebugDraw';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('PathPoint')
@executeInEditMode 
export class PathPoint extends Component {

    @property({ type: Boolean })
    public drawDebug: boolean = true;

    public leftVertex:Vec3 = null;
    public rightVertex:Vec3 = null;

    start() {

    }

    update(deltaTime: number) {
        if(this.drawDebug){

            //画自己所在的位置
            let selfWorldPos = this.node.worldPosition;
            drawCube(selfWorldPos, 0.1, Color.RED);

            //画左右顶点
            if(this.leftVertex){
                const worldPoint = new Vec3();
                Vec3.transformMat4(worldPoint, this.leftVertex, this.node.parent.worldMatrix);
                drawCube(worldPoint, 0.1, Color.BLUE);
                drawLineFromTo(selfWorldPos, worldPoint, Color.CYAN);
            }
            if(this.rightVertex){
                const worldPoint = new Vec3();
                Vec3.transformMat4(worldPoint, this.rightVertex, this.node.parent.worldMatrix);
                drawCube(worldPoint, 0.1, Color.GREEN);
                drawLineFromTo(selfWorldPos, worldPoint, Color.CYAN);
            }

            //画路径线
            let next = this.node.getSiblingIndex() + 1;
            if(next < this.node.parent!.children.length){
                let nextNode = this.node.parent!.children[next];
                let nextPos = nextNode.worldPosition;
                drawLineFromTo(selfWorldPos, nextPos, Color.YELLOW);
            }
        }
    }
}

