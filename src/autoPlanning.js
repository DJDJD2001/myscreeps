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
 * 半自动（该函数不涉及中心点自动规划，需要手动放零点旗帜）
 * 后续可以添加相关逻辑，自动寻找合适的中心点位置
 * 不使用完全的分布式规划（太麻烦），不涉及现有structure的改建（默认从零开始）
 * 集中布局后，在source边上靠近矩形中心点的位置放置container
 * controller边上放置link和container
 * mineral边上放置container
 * 再以最短路径放置road
 * 过程中会使用一个costmatrix，先不存在memory中了（感觉暂时用不到）
 * @param {Room} room 
 * @param {RoomPosition} zeroPoint
 * @returns {boolean} whether planning is done
 */
export function autoPlanRoom(room, zeroPoint) {

    room.memory.autoPlan = [];

    // 应用集中式布局
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

    // 给source铺路和container、link
    if (room.memory.source) {
        for (const s of room.memory.source) {
            const sourceId = s.id;
            const source = Game.getObjectById(sourceId);
            if (source) {
                let path = room.findPathToStorage(source.pos, 1);
                if (!path) {
                    console.log(`autoPlanning: cannot find path from source to storage in room ${room.name}`);
                    continue;
                }

                // 如果当前位置在规划里面没有road，则添加road
                path.path.forEach(roompos => {
                    const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                    if (!exist) {
                        room.memory.autoPlan.push({
                            pos: { x: roompos.x, y: roompos.y },
                            structureType: STRUCTURE_ROAD,
                            rcl: 1,
                        });
                    }
                });

                // 在source旁边放置container
                const containerPos = path.path[path.path.length - 1];
                room.memory.autoPlan.push({
                    pos: { x: containerPos.x, y: containerPos.y },
                    structureType: STRUCTURE_CONTAINER,
                    rcl: 1,
                });

                // 在source旁边合适位置布置link
                /* 策略1：
                // 尽量放在source旁边，但不能放在路上，如果source旁边只有一个空格等情况，link需要放在最近的可用点上，可用点为非路且非规划中位置
                const availableLinkPos = source.pos.findAvailablePosition();

                // 从可用点中选择距离source最近的点作为link位置
                const linkPos = source.pos.findClosestByPath(availableLinkPos, {
                    filter: (pos) => {
                        const isPlanned = room.memory.autoPlan.find(o => o.pos.x === pos.x && o.pos.y === pos.y);
                        return !isPlanned;
                    }
                });
                if (linkPos) {
                    room.memory.autoPlan.push({
                        pos: { x: linkPos.x, y: linkPos.y },
                        structureType: STRUCTURE_LINK,
                        rcl: 7,
                    });
                } else {
                    console.log(`autoPlanning: cannot find available link position for source in room ${room.name}`);
                }
                */

                // 策略2： 沿着路径往storage方向找第一个位置，满足该位置旁边有空位放Link
                let linkPos = null;
                for (let i = path.path.length - 1; i >= 0; i--) {
                    const roompos = path.path[i];
                    const pos = new RoomPosition(roompos.x, roompos.y, room.name);
                    const availableLinkPos = pos.findAvailablePosition(1);
                    if (availableLinkPos) {
                        linkPos = availableLinkPos.filter(p => {
                            const isPlanned = room.memory.autoPlan.find(o => o.pos.x === p.x && o.pos.y === p.y);
                            return !isPlanned;
                        })[0];
                    }
                    if (linkPos) {
                        room.memory.autoPlan.push({
                            pos: { x: linkPos.x, y: linkPos.y },
                            structureType: STRUCTURE_LINK,
                            rcl: 7,
                        });
                        break;
                    }
                }
                if (!linkPos) {
                    console.log(`autoPlanning: cannot find available link position for source in room ${room.name}`);
                }
            }
        }
    }

    // 给controller铺路和container、link
    if (room.controller) {
        let path = room.findPathToStorage(room.controller.pos, 3);
        if (!path) {
            console.log(`autoPlanning: cannot find path from controller to storage in room ${room.name}`);
        } else {
            // 如果当前位置在规划里面没有road，则添加road
            path.path.forEach(roompos => {
                const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                if (!exist) {
                    room.memory.autoPlan.push({
                        pos: { x: roompos.x, y: roompos.y },
                        structureType: STRUCTURE_ROAD,
                        rcl: 1,
                    });
                }
            });

            // 在工作位置放置container
            const containerPos = path.path[path.path.length - 1];
            room.memory.autoPlan.push({
                pos: { x: containerPos.x, y: containerPos.y },
                structureType: STRUCTURE_CONTAINER,
                rcl: 1,
            });

            // 放置link
            let linkPos = null;
            for (let i = path.path.length - 1; i >= 0; i--) {
                const roompos = path.path[i];
                const pos = new RoomPosition(roompos.x, roompos.y, room.name);
                const availableLinkPos = pos.findAvailablePosition(1);
                if (availableLinkPos) {
                    linkPos = availableLinkPos.filter(p => {
                        const isPlanned = room.memory.autoPlan.find(o => o.pos.x === p.x && o.pos.y === p.y);
                        return !isPlanned;
                    })[0];
                }
                if (linkPos) {
                    room.memory.autoPlan.push({
                        pos: { x: linkPos.x, y: linkPos.y },
                        structureType: STRUCTURE_LINK,
                        rcl: 5,
                    });
                    break;
                }
            }
            if (!linkPos) {
                console.log(`autoPlanning: cannot find available link position for controller in room ${room.name}`);
            }
        }
    }

    // 给mineral铺路和container
    const mineral = room.find(FIND_MINERALS)[0];
    if (mineral) {
        let path = room.findPathToStorage(mineral.pos, 1);
        if (!path) {
            console.log(`autoPlanning: cannot find path from mineral to storage in room ${room.name}`);
        } else {
            // 如果当前位置在规划里面没有road，则添加road
            path.path.forEach(roompos => {
                const exist = room.memory.autoPlan.find(o => o.pos.x === roompos.x && o.pos.y === roompos.y && o.structureType === STRUCTURE_ROAD);
                if (!exist) {
                    room.memory.autoPlan.push({
                        pos: { x: roompos.x, y: roompos.y },
                        structureType: STRUCTURE_ROAD,
                        rcl: 6,
                    });
                }
            });
            // 在mineral旁边放置container
            const containerPos = path.path[path.path.length - 1];
            room.memory.autoPlan.push({
                pos: { x: containerPos.x, y: containerPos.y },
                structureType: STRUCTURE_CONTAINER,
                rcl: 6,
            });
            // 放置extractor
            room.memory.autoPlan.push({
                pos: { x: mineral.pos.x, y: mineral.pos.y },
                structureType: STRUCTURE_EXTRACTOR,
                rcl: 6,
            });
        }
    }

    // 可视化
    visualizeAutoPlan(room);
    return true;
}

export function visualizeAutoPlan(room) {
    if (!room.memory.autoPlan) return;
    for (const item of room.memory.autoPlan) {
        room.visual.text(
            structureShape[item.structureType] || '?',
            item.pos.x, item.pos.y,
            { color: structureColor[item.structureType] || 'white', font: 0.8 }
        )
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
    [ 7, 8, 6, 6, 6, 8, 5, 8, 4, 4, 4, 4, 4 ],
    [ 7, 8, 8, 6, 5, 7, 0, 6, 3, 4, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 7, 4, 1, 2, 2, 4, 4, 4 ],
    [ 7, 7, 7, 7, 5, 5, 8, 2, 2, 2, 3, 3, 4 ],
    [ 0, 7, 7, 5, 5, 5, 5, 2, 2, 2, 3, 3, 0 ],
    [ 0, 7, 5, 7, 5, 5, 5, 5, 3, 2, 3, 8, 0 ],
    [ 0, 8, 7, 5, 5, 5, 5, 5, 3, 3, 8, 8, 0 ],
    [ 0, 0, 0, 0, 5, 5, 5, 5, 5, 0, 0, 0, 0 ],
];

const structureShape = {
    "spawn": "◎",
    "extension": "ⓔ",
    "link": "◈",
    "road": "•",
    "constructedWall": "▓",
    "rampart": "⊙",
    "storage": "▤",
    "tower": "🔫",
    "observer": "👀",
    "powerSpawn": "❂",
    "extractor": "⇌",
    "terminal": "✡",
    "lab": "☢",
    "container": "□",
    "nuker": "▲",
    "factory": "☭"
};

const structureColor = {
    "spawn": "cyan",
    "extension": "#0bb118",
    "link": "yellow",
    "road": "#fa6f6f",
    "constructedWall": "#003fff",
    "rampart": "#003fff",
    "storage": "yellow",
    "tower": "cyan",
    "observer": "yellow",
    "powerSpawn": "cyan",
    "extractor": "cyan",
    "terminal": "yellow",
    "lab": "#d500ff",
    "container": "yellow",
    "nuker": "cyan",
    "factory": "yellow"
}