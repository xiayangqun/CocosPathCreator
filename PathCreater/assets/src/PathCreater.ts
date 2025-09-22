import { _decorator, CCInteger, Component, gfx, instantiate, Mesh, Node, Prefab, Quat, Vec3, utils, MeshRenderer, CCFloat, math } from 'cc';
import { PathPoint } from './PathPoint';
const { ccclass, property } = _decorator;

@ccclass('PathCreateCtr')
export class PathCreateCtr extends Component {

    //路径点预制件
    @property(Prefab)
    pathPointPrefab: Prefab = null;

    //路径点节点的容易
    @property(Node)
    pathPointContainer: Node = null;

    //路径第一段的长度
    @property(CCInteger)
    firstSegmentLength: number = 5;

    //路径最后一段的长度
    @property(CCInteger)
    lastSegmentLength: number = 5;

    @property(Node)
    public itemsContainer: Node = null!;

    //路径网格 
    private mesh: Mesh = new Mesh();


    //一共会生成多少个路径点
    @property({ type: CCInteger })
    get pointCount(): number {
        return this._pointCount;
    }

    set pointCount(value: number) {

        this._pointCount = value;
        this.createPathPoint(value);
        this.createMeshData();

    }
    private _pointCount: number = 0;

    //除去开头和结尾的长度，每个路径点之间的直线长度。
    //此值越大，则路径越不平滑
    @property({ type: CCFloat })
    segmentLength: number = 1;

    //路径在上坡和下坡的时候，每个路径线段之间的夹角是多少，此值越大，则坡度变化越大
    @property({ type: CCFloat })
    slopeAngle: number = 15;

    //路径线段在上坡和下坡的时候允许的最大的角度是多少。
    @property({ type: CCFloat })
    maxSlopeAngle: number = 45;

    //跑道的宽度
    @property({ type: CCFloat })
    pathWidth: number = 8;

    private createPathPoint(newValue: number) {

        if (newValue < 3) {
            this.pathPointContainer.removeAllChildren();
            console.warn("路径点数量不能少于3个");
            return;
        }

        //先生成指定数量的路径点.
        let children = this.pathPointContainer.children;
        let currentLength = children.length;
        let needLength = newValue + 1; // 包括起点

        if (needLength > currentLength) {
            for (let i = currentLength; i < needLength; i++) {
                let newNode = instantiate(this.pathPointPrefab);
                newNode.parent = this.pathPointContainer;
            }
        } else if (needLength < currentLength) {
            for (let i = currentLength - 1; i >= needLength; i--) {
                this.pathPointContainer.removeChild(children[i]);
            }
        }

        //由 P0 到 P1的路径段l(0,1)为直线段，长度为 firstSegmentLength
        children = this.pathPointContainer.children;
        children[0].setPosition(0, 0, 0);
        children[1].setPosition(0, 0, -this.firstSegmentLength);

        let createDirecPathArray = (fromIndex: number, count: number) => {
            for (let j = 0; j < count; j++) {
                let curIndex = fromIndex + j;
                createDirecPath(curIndex);
            }
        }

        let createDirecPath = (fromIndex: number) => {
            let dir = Vec3.subtract(new Vec3(), children[fromIndex - 1].position, children[fromIndex - 2].position);
            dir = dir.normalize();
            let newPos = Vec3.scaleAndAdd(new Vec3(), children[fromIndex - 1].position, dir, this.segmentLength);
            children[fromIndex].setPosition(newPos);
        }

        let createLeftTurnPath = (fromIndex: number, count: number) => {
            for (let j = 0; j < count; j++) {
                let curIndex = fromIndex + j;
                let dir = Vec3.subtract(new Vec3(), children[curIndex - 1].position, children[curIndex - 2].position);
                dir = dir.normalize();
                let up = new Vec3(0, 1, 0);
                let quat = new Quat();
                Quat.fromAxisAngle(quat, up, this.slopeAngle * Math.PI / 180);
                let leftDir = Vec3.transformQuat(new Vec3(), dir, quat);
                let newPos = Vec3.scaleAndAdd(new Vec3(), children[curIndex - 1].position, leftDir, this.segmentLength);
                //如果弯度过大，导致当前的点z轴坐标大于前一个点的z轴坐标(路径回头了)，则重新生成该点为直线，路径点的z应该是越来越小的。因为-Z为前进方向
                if (newPos.z > children[curIndex - 1].position.z) {
                    createDirecPath(curIndex);
                }
                else {
                    children[curIndex].setPosition(newPos);
                }
            }
        }

        let createRightTurnPath = (fromIndex: number, count: number) => {
            for (let j = 0; j < count; j++) {
                let curIndex = fromIndex + j;
                let dir = Vec3.subtract(new Vec3(), children[curIndex - 1].position, children[curIndex - 2].position);
                dir = dir.normalize();
                let up = new Vec3(0, 1, 0);
                let quat = new Quat();
                Quat.fromAxisAngle(quat, up, -this.slopeAngle * Math.PI / 180);
                let rightDir = Vec3.transformQuat(new Vec3(), dir, quat);
                let newPos = Vec3.scaleAndAdd(new Vec3(), children[curIndex - 1].position, rightDir, this.segmentLength);
                //如果弯度过大，导致当前的点z轴坐标大于前一个点的z轴坐标(路径回头了)，则重新生成该点为直线
                if (newPos.z > children[curIndex - 1].position.z) {
                    createDirecPath(curIndex);
                }
                else {
                    children[curIndex].setPosition(newPos);
                }
            }
        }

        //当当前路径点设置为比前一个路径点在竖直方向上抬高angle度。
        let createPitchPath = (fromIndex: number, angle: number) => {
            let dir = Vec3.subtract(new Vec3(), children[fromIndex - 1].position, children[fromIndex - 2].position);
            dir = dir.normalize();
            let right = Vec3.cross(new Vec3(), dir, Vec3.UP);
            right = right.normalize();
            let quat = new Quat();
            Quat.fromAxisAngle(quat, right, angle * Math.PI / 180);
            let pitchDir = Vec3.transformQuat(new Vec3(), dir, quat);
            let newPos = Vec3.scaleAndAdd(new Vec3(), children[fromIndex - 1].position, pitchDir, this.segmentLength);
            children[fromIndex].setPosition(newPos);
        }

        let createNoseUpPitchPath = (fromIndex: number, slopAngle: number, slopStep: number) => {
            createDirecPath(fromIndex);
            for (let l = 1; l < slopStep; l++) {
                if (l < slopStep / 2) {
                    createPitchPath(fromIndex + l, slopAngle); //15
                } else {
                    createPitchPath(fromIndex + l, -slopAngle); //15
                }
            }
            //等价于
            // createPitchPath(fromIndex + 1, 15); //15
            // createPitchPath(fromIndex + 2, 15); //30
            // createPitchPath(fromIndex + 3, 15); //45
            // createPitchPath(fromIndex + 4, -15); //30
            // createPitchPath(fromIndex + 5, -15); // 15
            // createPitchPath(fromIndex + 6, -15); // 0
        }

        let createNoseDownPitchPath = (fromIndex: number, slopAngle: number, slopStep: number) => {
            createDirecPath(fromIndex);
            for (let l = 1; l < slopStep; l++) {
                if (l < slopStep / 2) {
                    createPitchPath(fromIndex + l, -slopAngle); //15
                } else {
                    createPitchPath(fromIndex + l, +slopAngle); //15
                }
            }
            //等价于
            // createPitchPath(fromIndex + 1, -15); //-15
            // createPitchPath(fromIndex + 2, -15); //-30
            // createPitchPath(fromIndex + 3, -15); //-45
            // createPitchPath(fromIndex + 4, 15); //-30
            // createPitchPath(fromIndex + 5, 15); // -15
            // createPitchPath(fromIndex + 6, 15); // 0
        }

        let i = 2;
        //爬坡或者下坡需要的路径点数量，假设我们的坡度变化为15度，最大坡度为45度，则需要7个路径点来完成一个完整的上坡和下坡
        // 0 15 30 45 30 15 0
        //如果坡度变化为10度，则需要10个路径点来完成一个完整的上坡和下坡
        // 0 10 20 30 40 50 40 30 20 10 0
        let slopeCount = Math.floor(this.maxSlopeAngle / this.slopeAngle) * 2 + 1;

        //单次转弯允许的最大段数，这里是为了防止一次转弯就累计到了90度，让路径点回头了
        let maxTurnCount = Math.floor(90 / this.slopeAngle);

        //路径点的最低高度和最高高度，如果上坡之前发现当前高度已经达到最高了，就不会再上坡了
        //同理，下坡也是一样的道理
        let minHight = 0 + 1.47;
        let maxHight = 5 - 1.47;
        while (i < needLength - 1) {
            // 0 直线
            // 1 左转
            // 2 右转
            // 3 上坡
            // 4 下坡
            let randomType = Math.floor(Math.random() * 5);
            if (randomType === 0) {
                let dirCectCount = Math.floor(Math.random() * maxTurnCount);
                //如果剩余的路径点不足，则直接创建剩余的所有路径点为直线
                if (i + dirCectCount >= needLength - 1) {
                    dirCectCount = needLength - 1 - i;
                }
                createDirecPathArray(i, dirCectCount);
                i += dirCectCount;
            }
            else if (randomType === 1) {
                //左转，随机N个路径点进行连续左转，只要N不超过maxTurnCount就行
                let turnCount = Math.floor(Math.random() * maxTurnCount);
                if (i + turnCount >= needLength - 1) {
                    turnCount = needLength - 1 - i;
                }
                createLeftTurnPath(i, turnCount);
                i += turnCount;
            }
            else if (randomType === 2) {
                //右转，随机N个路径点进行连续右转，只要N不超过maxTurnCount就行
                let turnCount = Math.floor(Math.random() * maxTurnCount);
                if (i + turnCount >= needLength - 1) {
                    turnCount = needLength - 1 - i;
                }
                createRightTurnPath(i, turnCount);
                i += turnCount;
            }
            else if (randomType === 3) {
                //如果当前高度已经达到最高了，就不会再上坡了，直接创建直线路径
                //如果剩余的路径点数量不足以完成一个完整的上坡和下坡，则创建直线路径
                if (children[i - 1].position.y < maxHight && i + slopeCount < needLength - 1) {
                    createNoseUpPitchPath(i, this.slopeAngle, slopeCount);
                    i += slopeCount;
                }
                else {
                    createDirecPath(i);
                }
            }
            else {
                //如果当前高度已经达到最低了，就不会再下坡了，直接创建直线路径
                //如果剩余的路径点数量不足以完成一个完整的上坡和下坡，则创建直线路径
                if (children[i - 1].position.y > minHight && i + slopeCount < needLength - 1) {
                    createNoseDownPitchPath(i, this.slopeAngle, slopeCount);
                    i += slopeCount;
                }
                else {
                    createDirecPath(i);
                }
            }
        }

        //最后一段路径为直线，长度为 lastSegmentLength
        let lastDir = Vec3.subtract(new Vec3(), children[needLength - 2].position, children[needLength - 3].position);
        lastDir = lastDir.normalize();
        let lastPos = Vec3.scaleAndAdd(new Vec3(), children[needLength - 2].position, lastDir, this.firstSegmentLength);
        children[needLength - 1].setPosition(lastPos);
    }

    private createMeshData() {

        let children = this.pathPointContainer.children;
        let currentLength = children.length;
        if (currentLength < 2) {
            console.warn("路径点数量不足，无法生成网格");
            return;
        }

        let leftArray: Array<Vec3> = [];
        let rightArray: Array<Vec3> = [];

        //计算每个路径点的左右顶点位置
        for (let i = 0; i < currentLength; i++) {
            let pathWidth = this.pathWidth;
            let dir: Vec3;
            if (i == 0) {
                dir = Vec3.subtract(new Vec3(), children[i + 1].position, children[i].position);
            }
            else if (i == currentLength - 1) {
                dir = Vec3.subtract(new Vec3(), children[i].position, children[i - 1].position);
            }
            else {
                dir = Vec3.subtract(new Vec3(), children[i + 1].position, children[i - 1].position);
            }

            dir = dir.normalize();
            let right = Vec3.cross(new Vec3(), dir, Vec3.UP);
            right = right.normalize();
            let leftPoint = Vec3.scaleAndAdd(new Vec3(), children[i].position, right, -pathWidth / 2);
            let rightPoint = Vec3.scaleAndAdd(new Vec3(), children[i].position, right, pathWidth / 2);

            children[i].getComponent(PathPoint).leftVertex = leftPoint;
            children[i].getComponent(PathPoint).rightVertex = rightPoint;

            leftArray.push(leftPoint);
            rightArray.push(rightPoint);
        }


        let vertices: number[] = new Array((currentLength - 1) * 6 * 3);
        let normals: number[] = new Array((currentLength - 1) * 6 * 3);
        let indices: number[] = new Array((currentLength - 1) * 2 * 3);
        //顶点数据集
        for (let i = 0; i < currentLength - 1; i++) {
            let verticesStartIndex = i * 6 * 3;

            //左边三角形
            vertices[verticesStartIndex + 0] = leftArray[i].x;
            vertices[verticesStartIndex + 1] = leftArray[i].y;
            vertices[verticesStartIndex + 2] = leftArray[i].z;

            vertices[verticesStartIndex + 3] = rightArray[i].x;
            vertices[verticesStartIndex + 4] = rightArray[i].y;
            vertices[verticesStartIndex + 5] = rightArray[i].z;

            vertices[verticesStartIndex + 6] = leftArray[i + 1].x;
            vertices[verticesStartIndex + 7] = leftArray[i + 1].y;
            vertices[verticesStartIndex + 8] = leftArray[i + 1].z;

            //右边三角形
            vertices[verticesStartIndex + 9] = leftArray[i + 1].x;
            vertices[verticesStartIndex + 10] = leftArray[i + 1].y;
            vertices[verticesStartIndex + 11] = leftArray[i + 1].z;

            vertices[verticesStartIndex + 12] = rightArray[i].x;
            vertices[verticesStartIndex + 13] = rightArray[i].y;
            vertices[verticesStartIndex + 14] = rightArray[i].z;

            vertices[verticesStartIndex + 15] = rightArray[i + 1].x;
            vertices[verticesStartIndex + 16] = rightArray[i + 1].y;
            vertices[verticesStartIndex + 17] = rightArray[i + 1].z;

            //法线
            let solveNormal = (target: Vec3, p1: Vec3, p2: Vec3) => {
                let v1 = Vec3.subtract(new Vec3(), p1, target);
                let v2 = Vec3.subtract(new Vec3(), p2, target);
                let normal = Vec3.cross(new Vec3(), v1, v2);
                normal = normal.normalize();
                return normal;
            }

            let leftArrayN = solveNormal(leftArray[i], rightArray[i], leftArray[i + 1]);
            let rightArrayN = leftArrayN//solveNormal(rightArray[i], leftArray[i + 1], leftArray[i]);
            let leftNextN = leftArrayN//solveNormal(leftArray[i + 1], leftArray[i], rightArray[i]);

            let leftNextN2 = leftArrayN;//solveNormal(leftArray[i + 1], rightArray[i], rightArray[i + 1]);
            let rightN2 =  leftNextN2;//solveNormal(rightArray[i], rightArray[i + 1], leftArray[i + 1]);
            let rightNextN = leftNextN2;//solveNormal(rightArray[i + 1], leftArray[i + 1], rightArray[i]);

            //左边三角形
            normals[verticesStartIndex + 0] = leftArrayN.x;
            normals[verticesStartIndex + 1] = leftArrayN.y;
            normals[verticesStartIndex + 2] = leftArrayN.z;

            normals[verticesStartIndex + 3] = rightArrayN.x;
            normals[verticesStartIndex + 4] = rightArrayN.y;
            normals[verticesStartIndex + 5] = rightArrayN.z;

            normals[verticesStartIndex + 6] = leftNextN.x;
            normals[verticesStartIndex + 7] = leftNextN.y;
            normals[verticesStartIndex + 8] = leftNextN.z;

            //右边三角形
            normals[verticesStartIndex + 9] = leftNextN2.x;
            normals[verticesStartIndex + 10] = leftNextN2.y;
            normals[verticesStartIndex + 11] = leftNextN2.z;

            normals[verticesStartIndex + 12] = rightN2.x;
            normals[verticesStartIndex + 13] = rightN2.y;
            normals[verticesStartIndex + 14] = rightN2.z;

            normals[verticesStartIndex + 15] = rightNextN.x;
            normals[verticesStartIndex + 16] = rightNextN.y;
            normals[verticesStartIndex + 17] = rightNextN.z;



            //索引数据集
            let indicesStartIndex = i * 2 * 3;
            let vertexIndex = i * 6;
            indices[indicesStartIndex + 0] = vertexIndex + 0;
            indices[indicesStartIndex + 1] = vertexIndex + 1;
            indices[indicesStartIndex + 2] = vertexIndex + 2;

            indices[indicesStartIndex + 3] = vertexIndex + 3;
            indices[indicesStartIndex + 4] = vertexIndex + 4;
            indices[indicesStartIndex + 5] = vertexIndex + 5;
        }

        const mesh: Mesh = utils.MeshUtils.createMesh(
            {
                positions: vertices,
                indices: indices,
                normals: normals,
            },
            this.mesh,
        );
        this.node.getComponent(MeshRenderer).mesh = this.mesh;
    }

    
    //根据给出的虚拟位置，将物体放置到跑道上
    public putItemByVirtualPosition (node:Node, vx:number, vz:number): boolean {
        let startPointIndex = Math.floor(vz / this.segmentLength) + 1;
        let endPointIndex = startPointIndex + 1;

        if(startPointIndex >= this.pathPointContainer.children.length -1){
            //想要投放的物体已经超出了跑道的范围
            return false;
        }
        else{
            let startPoint = this.pathPointContainer.children[startPointIndex];
            let endPoint = this.pathPointContainer.children[endPointIndex];

            let dir = Vec3.subtract(new Vec3(), endPoint.position, startPoint.position);
            dir = dir.normalize();
            let remainZ = vz - (startPointIndex - 1) * this.segmentLength;
            let pos = Vec3.scaleAndAdd(new Vec3(), startPoint.position, dir, remainZ);
            

            node.parent = this.itemsContainer;
            node.forward = dir;
            node.position = pos;
            let right = Vec3.cross(new Vec3(), dir, Vec3.UP).normalize();
            node.position = Vec3.scaleAndAdd(new Vec3(), node.position, right, vx);
            return true;
        }
    }

    public clearAllItems(){
        this.itemsContainer.removeAllChildren();
    }
}

