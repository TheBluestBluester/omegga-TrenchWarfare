# TrenchWarfare
Dig trench n fight for stuff.

If the minigame and the enviroment are not already setup the plugin will do it automatically.
You can change the enviroment and the minigame in the "Minig and Env" folder.
Make sure when changing that the names match.

You can also add or remove maps in the Map folder.

# Requires death events to run.

## Guide to creating maps:
The included minigame uses the default color pallete.

### To make the maps function you have to add interact component with the following in the ConsoleTag:

#### trench
The trench.
Adding undiggable will make the trench undiggable. Undiggable trench will also not be effected by explosives.
#### redflag
Red team's flag
#### blueflag
Blue team's flag
#### destructable
Destructable bricks which are effected by explosives.
#### zone
The zone. Acts like an undiggable trench brick. You must include the zone's order in the Messages textbox. 1, 2, 3, n.. is from red to blue.

#### Notes:
Trench cannot be placed on non-trench bricks.

The trench bricks MUST be 2x cubes, 4x cubes, 16x, 32x, 64x, etc.

For the modes to work add the following prefixes: CTF_ for capture-the-flag, ZC_ for zone control. Maps with no prefix will default to CTF.

#### Adding maps
After your map has been completed you can simply put the map BRS file into the Map folder in the plugin and then restart the plugin.
