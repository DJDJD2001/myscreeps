export const mountRoomPositionPrototype = function () {
    _.assign(RoomPosition.prototype, extensions)
}

const extensions = {
    /**
     * 查看该位置周围一圈的可用地块数量（非墙）
     * @return {number} 可用地块数量
     */
    lookForAvailableAdjacentCount() {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = this.x + dx;
                const y = this.y + dy;
                if (x < 0 || x >= 50 || y < 0 || y >= 50) continue;
                const terrain = Game.rooms[this.roomName].getTerrain().get(x, y);
                if (terrain !== TERRAIN_MASK_WALL) {
                    count++;
                }
            }
        }
        return count;
    },

    /**
     * autoplan用，找出指定范围内可以放置建筑的全部位置
     * @param {number} range 查找范围(以this为中心，半径单位，默认5)
     * @return {[RoomPosition]|null} 可用位置，找不到返回null
     */
    findAvailablePosition(range = 5) {
        if (!this.roomName) return null;
        const positions = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const x = this.x + dx;
                const y = this.y + dy;
                if (x < 0 || x >= 50 || y < 0 || y >= 50) continue;
                const terrain = Game.rooms[this.roomName].getTerrain().get(x, y);
                if (terrain === TERRAIN_MASK_WALL) continue;
                positions.push(new RoomPosition(x, y, this.roomName));
            }
        }
        return positions.length > 0 ? positions : null;
    }

}