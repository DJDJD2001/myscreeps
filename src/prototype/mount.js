import { mountCreepPrototype } from './prototype_creep'
import { mountRoomPositionPrototype } from './prototype_RoomPosition'
import { mountSpawnPrototype } from './prototype_spawn'
import { mountRoomPrototype } from './prototype_room'

/**
 * 挂载所有原型扩展
 */
export const mountAll = function () {
    mountCreepPrototype();
    mountRoomPositionPrototype();
    mountSpawnPrototype();
    mountRoomPrototype();
}