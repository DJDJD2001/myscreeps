/**
 * TODO
 * auto planning construction site in the room, save result in Memory.rooms[roomName].autoPlan
 * usage: place a red/white flag in the room
 * do doAutoPlanning() every tick to check for flags and plan automatically
 * notice: need high cpu, check cpu bucket before use
 * @returns {void}
 */
export function doAutoPlanning() {
    let room;
    
    for (const flag of _.values(Game.flags)) {
        if (flag.color === COLOR_RED || flag.secondaryColor === COLOR_WHITE) {
            room = flag.room;
            flag.remove();
            break;
        }
    }

    if (!room) {
        console.log('autoPlanning: no red/white flag found in any room or room not visible');
        return; // no flag found or room not visible
    }

    room.memory.autoPlan = []; // init

    /* 
    具体逻辑笔记：
    不使用完全的分布式规划（太麻烦），不涉及现有structure的改建（默认从零开始）
    使用集中式，这样的话只需要确认中心点即可
    遍历所有非墙点，记录该点距所有source、controller、mineral的总距离
    找到一个矩形，其中心点总距离最小，且矩形内无墙
    矩形大小为：TODO
    之后，在source边上靠近矩形中心点的位置放置container
    controller边上放置link和container
    mineral边上放置container
    再以最短路径放置road
    */

}

// 布局参数（以中心点为x0,y0）
const layout = [

]
