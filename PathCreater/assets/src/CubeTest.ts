import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CubeTest')
export class CubeTest extends Component {
    start() {
        this.node.forward;
    }

    update(deltaTime: number) {
        
    }
}

