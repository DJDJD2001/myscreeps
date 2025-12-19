export const mountSpawnPrototype = function () {
    _.assign(Spawn.prototype, extensions);
};

const extensions = {
    /**
     * 尝试生成 spawnList 中的第一个 creep, 如果成功则从列表中移除
     * @return {number} 生成结果
     */
    trySpawn() {
        if (this.spawning 
            || !this.room.memory.spawnList 
            || this.room.memory.spawnList.length === 0
        ) {
            return OK;
        }
        const ifspawnSuccess = this.spawnCreep(
            this.room.memory.spawnList[0].body,
            this.room.memory.spawnList[0].name,
            this.room.memory.spawnList[0].opts
        );
        if (ifspawnSuccess === OK) {
            this.room.memory.spawnList.shift();
        }
        return ifspawnSuccess;
    },
}