import { CharacterPlugin, PhysicsPlugin, type Plugin } from "@dylanebert/shallot";
import { SandboxPlugin } from "./sandbox";
import { PlayerPlugin } from "./player";

export const APP_PLUGINS: Plugin[] = [PhysicsPlugin, CharacterPlugin, PlayerPlugin, SandboxPlugin];
