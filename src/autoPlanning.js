/**
 * auto planning construction site in the room, save result in Memory.rooms[roomName].autoPlan
 * usage: place a red/white flag in the room's first spawn position
 * do checkAutoPlanning() every tick T check for flags and plan automatically
 * @returns {boolean} whether planning is done
 */
export function checkAutoPlanning() {
    let room;
    let zeroPoint;

    for (const flag of _.values(Game.flags)) {
        if (flag.color === COLOR_RED || flag.secondaryColor === COLOR_WHITE) {
            room = flag.room;
            zeroPoint = new RoomPosition(flag.pos.x - 7, flag.pos.y - 7, flag.pos.roomName);
            flag.remove();
            break;
        }
    }

    if (!room) {
        return false;
    } else {
        return autoPlanRoom(room, zeroPoint);
    }
}

/**
 * auto plan the room, save result in Memory.rooms[roomName].autoPlan
 * 具体逻辑笔记：
 * 使用集中式，这样的话只需要确认中心点即可
 * 半自动（该函数不涉及中心点自动规划，需要手动放中心点旗帜）
 * 后续可以添加相关逻辑，自动寻找合适的中心点位置
 * 不使用完全的分布式规划（太麻烦），不涉及现有structure的改建（默认从零开始）
 * 集中布局后，在source边上靠近矩形中心点的位置放置container
 * controller边上放置link和container
 * mineral边上放置container
 * 再以最短路径放置road
 * @param {Room} room 
 * @param {RoomPosition} zeroPoint
 * @returns {boolean} whether planning is done
 */
export function autoPlanRoom(room, zeroPoint) {

    room.memory.autoPlan = [];

    for (let dy = 0; dy < layout.length; dy++) {
        for (let dx = 0; dx < layout[0].length; dx++) {
            const structureType = layout[dy][dx];
            if (structureType !== E) {
                const pos = { x: zeroPoint.x + dx, y: zeroPoint.y + dy };
                room.memory.autoPlan.push({
                    pos: pos,
                    structureType: structureType,
                    rcl: layoutrcl[dy][dx],
                });
            }
        }
    }

    if (room.memory.source) {
        for (const sourceId of room.memory.source) {
            const source = Game.getObjectById(sourceId);
            if (source) {
    }
}

// 布局参数（以左上角为x0,y0）
const E = 'empty';
const X = STRUCTURE_EXTENSION;
const R = STRUCTURE_ROAD;
const S = STRUCTURE_SPAWN;
const T = STRUCTURE_TOWER;
const L = STRUCTURE_LAB;
const I = STRUCTURE_LINK;
const G = STRUCTURE_STORAGE;
const P = STRUCTURE_POWER_SPAWN;
const N = STRUCTURE_NUKER;
const M = STRUCTURE_TERMINAL;
const F = STRUCTURE_FACTORY;
const O = STRUCTURE_OBSERVER;

const layout = [
    [ E, E, E, E, R, R, R, R, R, E, E, E, E ],
    [ E, T, E, R, X, X, X, X, X, R, X, T, E ],
    [ E, E, R, L, L, L, X, X, X, X, R, X, E ],
    [ E, R, L, R, L, L, R, X, X, R, X, R, E ],
    [ R, X, L, L, R, R, O, R, R, X, X, X, R ],
    [ R, X, L, L, R, P, I, S, R, X, X, X, R ],
    [ R, X, X, R, T, F, E, M, T, R, X, X, R ],
    [ R, X, X, X, R, S, G, S, R, X, X, X, R ],
    [ R, X, X, X, R, R, N, R, R, X, X, X, R ],
    [ E, R, X, R, X, X, R, X, X, R, X, R, E ],
    [ E, X, R, X, X, X, X, X, X, X, R, X, E ],
    [ E, T, X, R, X, X, X, X, X, R, X, T, E ],
    [ E, E, E, E, R, R, R, R, R, E, E, E, E ],
];

const layoutrcl = [
    [ 0, 0, 0, 0, 7, 7, 7, 6, 6, 0, 0, 0, 0 ],
    [ 0, 7, 0, 7, 8, 8, 8, 6, 6, 6, 6, 8, 0 ],
    [ 0, 0, 7, 8, 8, 8, 8, 6, 6, 6, 4, 6, 0 ],
    [ 0, 7, 8, 7, 7, 7, 6, 6, 6, 4, 6, 4, 0 ],
    [ 7, 8, 8, 6, 6, 6, 8, 6, 4, 4, 4, 4, 4 ],
    [ 7, 8, 6, 6, 6, 8, 6, 8, 4, 4, 4, 4, 4 ],
    [ 7, 8, 8, 6, 5, 7, 0, 6, 3, 4, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 7, 4, 1, 2, 2, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 5, 8, 2, 2, 2, 3, 3, 4 ],
    [ 0, 7, 7, 5, 5, 5, 5, 2, 2, 2, 3, 3, 0 ],
    [ 0, 7, 5, 7, 5, 5, 5, 5, 3, 2, 3, 8, 0 ],
    [ 0, 8, 7, 5, 5, 5, 5, 5, 3, 3, 8, 8, 0 ],
    [ 0, 0, 0, 0, 5, 5, 5, 5, 5, 0, 0, 0, 0 ],
]