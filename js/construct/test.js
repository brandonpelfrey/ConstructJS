[init]
    id = identity()
    walls = 1 - dot(id, id)

    zero = 0
    u = (0, 0)
    density = mask(.1 - dot(id,id))

    dt = .1

    grid_config = grid( resolution=512, min=(-1, -1), max=(1, 1) )

[main-simulation]
    density = warp(density, id - dt * u)
    u = warp(u, id - dt * u)
    u = divFree(u, neumann=walls)

    density = writeToGrid(density, grid_config, 0)
    u = writeToGrid(u, grid_config, (0,0))