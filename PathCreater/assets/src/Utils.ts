import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;


export class Utils  {
    public static getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }
}

