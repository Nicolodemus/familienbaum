/** Creates a layout for given DAG
	Usage example:
	let layout = new Dag_Layout(dag_with_family_data);
	layout.run(); // run the algorithm
	let node = dag_with_family_data.find_node("ID");
	console.log([ node.x, node.y ]);
*/
class Dag_Layout
{
	constructor(dag_with_family_data, node_size) {
		this.dag = dag_with_family_data;
		this.generations = new Map();
		this.groupings = { "partners": [], "siblings": [] };
		this.node_size = node_size;
	}

	run() {
		this.add_object_to_nodes("added_relations.layout");
		this.assign_generation();
		this.assign_grouping();
		this.assign_ages();
		this.align_all();
	}

	assign_generation() {
		// Add generation ID to node, and add the node to the map
		let add_generation = (node, generation_id) => {
			let layout = node.added_relations.layout;
			let added = this.add_to_object(layout, "generation_id", generation_id);
			if (added) {
				this.add_to_map(this.generations, generation_id, new Array());
				this.generations.get(generation_id).push(node);
			}
			return added;
		};
		// Determine generation using an advancing front approach
		for (let starting_node of get_roots(this.dag)) {
			add_generation(starting_node, 0);
			let border = [starting_node];
			while (border.length > 0) {
				let next = [];
				for (let node of border) {
					let generation_id = node.added_relations.layout.generation_id;
					for (let parent of this.dag.parents(node)) {
						if (add_generation(parent, generation_id - 1)) {
							next.push(parent);
						}
					}
					for (let child of node.children()) {
						if (add_generation(child, generation_id + 1)) {
							next.push(child);
						}
					}
				}
				border = next;
			}
		}
	}

	assign_grouping() {
		// Groups can be "partnership" or "siblings"
		let add_new_group = group_name => {
			let group = new Object();
			group.added_data = new Object();
			group.nodes = new Array();
			group.id = this.groupings[group_name].length;
			this.groupings[group_name].push(group);
			return group;
		};
		// Accumulate all of a group to node
		let accumulate = (group_name, node) => {
			let layout = node.added_relations.layout;
			layout[group_name] = layout[group_name+"_ids"].reduce((all, id) => {
				let nodes_of_id = this.groupings[group_name][id].nodes;
				return all.concat(nodes_of_id);
			}, []);
		};
		// Add objects to store group IDs
		for (let node of this.dag.nodes()) {
			let layout = node.added_relations.layout;
			this.add_to_object(layout, "partners_ids", []);
			this.add_to_object(layout, "siblings_ids", []);
		}
		// Assign partnership and siblings
		for (let node of this.dag.nodes()) {
			if (this.is_member(node)) continue; // skip members
			let partnership = add_new_group("partners");
			for (let parent of this.dag.parents(node)) {
				let layout = parent.added_relations.layout;
				layout.partners_ids.push(partnership.id);
				partnership.nodes.push(parent);
			}
			let siblings = add_new_group("siblings");
			for (let child of node.children()) {
				let layout = child.added_relations.layout;
				layout.siblings_ids.push(siblings.id);
				siblings.nodes.push(child);
			}
		}
		// Assign partners and siblings
		for (let node of this.dag.nodes()) {
			accumulate("partners", node);
			accumulate("siblings", node);
		}
		// Extend dag interface to return the partners
		this.dag.get_partners = function(node) {
			let layout = node.added_relations.layout;
			return layout.partners;
		};
		// Extend dag interface to return the number of siblings
		this.dag.get_number_of_siblings = function(node) {
			let layout = node.added_relations.layout;
			return layout.siblings.length;
		};
	}

	assign_ages() {
		// Set the age of all nodes (family nodes will be adjusted)
		for (let node of this.dag.nodes()) {
			node.added_data.age = get_year_of_birth_date(node);
		}
		// Set the age of family nodes
		for (let node of this.dag.nodes()) {
			if (this.is_member(node)) continue; // only family nodes
			let parent_age = this.get_oldest_age(this.dag.parents(node));
			if (parent_age) {
				node.added_data.age = parent_age;
				continue;
			}
			let layout = node.added_relations.layout;
			let children_age = this.get_average_age(node.children());
			if (children_age) {
				node.added_data.age = children_age;
			}
		}
		// Extend dag interface to return the age
		this.dag.get_age = function(node) {
			return node.added_data.age;
		};
	}

	align_all() {
		// Sort generations by ID
		let generations = Array.from(this.generations).sort((g_1, g_2) => {
			return g_1[0] > g_2[0];
		});
		let center = 0.0;
		// Iterate all generations in order to assign coordinates
		for (let [generation_id, nodes] of generations) {
			this.align_generation(generation_id, nodes);
			let limits = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
			for (let node of nodes) {
				limits[0] = Math.min(limits[0], node.x);
				limits[1] = Math.max(limits[1], node.x);
			}
			let new_center = (limits[0] + limits[1]) / 2.0;
			let offset = center - new_center;
			for (let node of nodes) {
				node.x += offset;
			}
			center = new_center + offset;
		}
		// Perform a relaxation of coordinates
		let relaxation = new Dag_Relaxation(this.dag, this.node_size);
		for (let pass of [1, 2, 3, 4, 5, 6, 7, 8]) {
			for (let [generation_id, nodes] of generations) {
				relaxation.run(nodes);
			}
		}
	}

	align_generation(generation_id, nodes) {
		// Assign coordinates to all nodes of one generation
		for (let pass of [1, 2, 3]) {
			nodes.sort((node_1, node_2) => {
				// First try to use (previously set) coordinates
				if ((node_1.x != undefined) && (node_2.x != undefined)) {
					if (node_1.x > node_2.x) return true;
					if (node_1.x < node_2.x) return false;
				}
				// If equal, fall-back to the age
				let node_pair = [node_1, node_2];
				let compare = node_pair.map(this.dag.get_age);
				return compare[0] > compare[1];
			});
			let position = {
				"x": 0.0, 
				"y": generation_id * this.node_size[1]
			};
			for (let node of nodes) {
				node.x = position.x;
				node.y = position.y;
				position.x += this.node_size[0];
			}
			if (pass == 1) { // re-alignment toward parents
				for (let node of nodes) {
					let parents = this.dag.parents(node);
					this.align_to_parents(node, parents);
				}
			}
			if (pass == 2) { // re-alignment of partners
				for (let node of nodes) {
					if (!this.is_member(node)) continue;
					this.align_partners(this.dag.get_partners(node));
				}
			}
		}
	}

	add_to_map(object, key, value) {
		let added = false;
		if (!object.has(key)) {
			object.set(key, value);
			added = true;
		}
		return added;
	}

	add_to_object(object, key, value) {
		let added = false;
		if (!object.hasOwnProperty(key)) {
			object[key] = value;
			added = true;
		}
		return added;
	}

	add_object_to_nodes(keys) {
		let added = false;
		let key_array = keys.split(".");
		for (let node of this.dag.nodes()) {
			let target = node;
			for (let key of key_array) {
				if (!target.hasOwnProperty(key)) {
					target[key] = new Object();
					added = true;
				}
				target = target[key];
			}
		}
		return added;
	}

	align_partners(partners) {
		if (partners.length < 2) return;
		partners.sort((node_1, node_2) => {
			let node_pair = [node_1, node_2];
			let compare = node_pair.map(this.dag.get_number_of_siblings);
			if (compare[0] != compare[1]) {
				return compare[0] < compare[1];
			}
			// If equal, fall-back to the age
			compare = node_pair.map(this.dag.get_age);
			return compare[0] > compare[1];
		});
		let node_1 = partners[0];
		let node_partners = partners.filter(node => node != node_1);
		for (let node_2 of node_partners) {
			node_2.x = node_1.x+1;
		}
	}

	align_to_parents(node, parents) {
		if (parents.length < 1) return;
		node.x = this.get_average_x(parents);
	}

	get_average_x(objects) {
		if (objects.length <= 0) return undefined;
		return objects.reduce((sum, object) => {
			return sum + object.x;
		}, 0.0)/objects.length;
	}
	
	get_average_age(objects) {
		if (objects.length <= 0) return undefined;
		return objects.reduce((sum, object) => {
			return sum + object.added_data.age;
		}, 0)/objects.length;
	}
	
	get_oldest_age(objects) {
		if (objects.length <= 0) return undefined;
		return objects.reduce((minimum, object) => {
			return Math.min(minimum, object.added_data.age);
		}, Number.POSITIVE_INFINITY);
	}

	is_member(node) {
		return node.added_data.input? true: false;
	};
};
