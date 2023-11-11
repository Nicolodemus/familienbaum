/** Relaxation of a given DAG
	Usage example:
	let relaxation = new Dag_Relaxation(dag_with_coordinates);
	relaxation.run(nodes); // run the algorithm on nodes (of one generation)
*/
class Dag_Relaxation
{
	constructor(dag_with_coordinates, node_size) {
		this.dag = dag_with_coordinates;
		this.node_size = node_size;
	}

	run(nodes) {
		let number_of_passes = 10*nodes.length;
		for (let pass = 0; pass < number_of_passes; pass++) {
			for (let [i, node] of nodes.entries()) {
				let gravity = 0.1/number_of_passes;
				let force = 0.0;
				if (i < nodes.length-1) {
					force += this.get_pressure(nodes[i+1], node, this.node_size[0]);
				}
				if (i > 0) {
					force += this.get_pressure(nodes[i-1], node, this.node_size[0]);
				}
				for (let parent of this.dag.parents(node)) {
					force += gravity*this.get_gravity(parent, node);
				}
				for (let child of node.children()) {
					force += gravity*this.get_gravity(child, node);
				}
				node.x += force;
			}
		}
		// Enforce that there is no overlap
		this.enforce_placement(nodes);
	}

	enforce_placement(nodes) {
		let position_x = Number.NEGATIVE_INFINITY;
		for (let node of nodes) {
			position_x += this.node_size[0];
			if (node.x < position_x) {
				node.x = position_x;
			} else {
				position_x = node.x;
			}
		}
	}

	get_gravity(neighbor, node) {
		return neighbor.x-node.x;
	}

	get_pressure(neighbor, node, node_size_x) {
		let difference = node.x-neighbor.x;
		let distance = Math.abs(difference);
		let overlap = node_size_x-distance;
		if (overlap < 0.0) return 0.0;
		let direction = (difference < 0.0? -1.0: 1.0);
		return overlap*direction;
	}
};