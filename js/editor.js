Familienbaum.prototype.create_editing_form = function(node_of_dag, node_of_dag_all) {
	// Get an ID for a new member
	function get_new_id(members) {
		for (let id = 500; id < 10000; id++) {
			let id_string = "@I" + id + "@";
			if (!members.hasOwnProperty(id_string)) return id_string;
		}
		throw "No new ID available";
	}
	// Adds a new member to the data
	function create_new_member(members) {
		let new_id = get_new_id(members);
		members[new_id] = new Object();
		for (let id in members) {
			for (let key in members[id])
				if (typeof members[id][key] == "string") members[new_id][key] = "";
			return new_id;
		}
		throw "Cannot create new member";
	}
	// A fallback for the starting node
	let node_fallback = undefined;
	// The number of ingoing and outgoing edges
	let inout = { "in": 0, "out": 0 };
	for (let link of this.data["links"]) {
		if (link[0] == node_of_dag.data) {
			inout.out++;
			node_fallback = link[1];
		}
		if (link[1] == node_of_dag.data) {
			inout.in++;
			node_fallback = link[0];
		}
	}
	// Open relationship around the node
	for (let node of this.get_relationship_in_dag_all(node_of_dag_all))
		node.added_data.is_visible = true;
	this.draw(true, node_of_dag_all.data);
	// Create the HTML form
	let form = this.editing_div.append("form");
	// Add a button and the according callback
	if (node_of_dag_all.data == "@I118@") {
		form.append("button").attr("type", "button").html("All").on("click", event => {
			for (let node of this.dag_all.nodes()) {
				node.added_data.is_visible = true;
			}
			this.draw(false);
		});
	}
	// Add a button and the according callback
	form.append("button").attr("type", "button").html("All parents").on("click", event => {
		let parents = Array.from(this.dag_all.parents(node_of_dag_all));
		while (parents.length > 0) {
			let parent = parents.pop();
			parent.added_data.is_visible = true;
			parents = parents.concat(this.dag_all.parents(parent));
		}
		this.draw(false);
	});
	// Add a button and the according callback
	form.append("button").attr("type", "button").html("All children").on("click", event => {
		let children = Array.from(node_of_dag_all.children());
		while (children.length > 0) {
			let child = children.pop();
			child.added_data.is_visible = true;
			children = children.concat(Array.from(child.children()));
		}
		this.draw(false);
	});
	// Add a button and the according callback
	form.append("button").attr("type", "button").html("All children-in-law").on("click", event => {
		let children = Array.from(node_of_dag_all.children());
		while (children.length > 0) {
			let child = children.pop();
			child.added_data.is_visible = true;
			children = children.concat(Array.from(child.children()));
			if (!is_member(child)) { // partners
				let parents = this.dag_all.parents(child);
				for (let parent of parents) {
					parent.added_data.is_visible = true;
				}
			}
		}
		this.draw(false);
	});
	// Member node
	if (is_member(node_of_dag)) {
		if (inout.in == 0) { // no parents
			form.append("button").attr("type", "button").html("Add parents").on("click", event => {
				// 1. Update the member data
				let parents = new Set();
				parents.add(create_new_member(this.data["members"]));
				parents.add(create_new_member(this.data["members"]));
				// 2. Update the links
				let parents_array = Array.from(parents).sort();
				let parents_id = JSON.stringify(parents_array);
				this.data["links"].push([parents_id, node_of_dag.data]);
				this.data["links"].push([parents_array[0], parents_id]);
				this.data["links"].push([parents_array[1], parents_id]);
				// 3. Recreate the DAGs
				this.reset_dags();
				this.draw(false);
				form.remove();
			});
		}
		// Add a button and the according callback
		form.append("button").attr("type", "button").html("Add partner").on("click", event => {
			// 1. Update the member data
			let partner = create_new_member(this.data["members"]);
			// 2. Update the links
			let partnership_array = [partner, node_of_dag.data].sort();
			let partnership_id = JSON.stringify(partnership_array);
			this.data["links"].push([node_of_dag.data, partnership_id]);
			this.data["links"].push([partner, partnership_id]);
			// 3. Recreate the DAGs
			this.reset_dags();
			this.draw(false);
		});
	} else // family node
	{
		if (inout.in < 2) { // no partner
			form.append("button").attr("type", "button").html("Add parent/partner").on("click", event => {
				// 1. Update the member data
				let new_id = create_new_member(this.data["members"]);
				// 2. Update the links
				this.data["links"].push([new_id, node_of_dag.data]);
				// 3. Recreate the DAGs
				this.reset_dags();
				this.draw(false);
				form.remove();
			});
		}
		// Add a button and the according callback
		form.append("button").attr("type", "button").html("Add child").on("click", event => {
			// 1. Update the member data
			let new_id = create_new_member(this.data["members"]);
			// 2. Update the links
			this.data["links"].push([node_of_dag.data, new_id]);
			// 3. Recreate the DAGs
			this.reset_dags();
			this.draw(false);
		});
	}
	// Only if this is a leaf node
	if (inout.in + inout.out == 1) {
		form.append("button").attr("type", "button").html("Remove").on("click", event => {
			// 1. Update the member data
			delete this.data["members"][node_of_dag.data];
			// 2. Update the links
			let id = node_of_dag.data;
			this.data["links"] = this.data["links"].filter(link => (link[0] != id) && (link[1] != id));
			this.data["start"] = node_fallback;
			// 3. Recreate the DAGs
			this.reset_dags();
			this.draw(false);
			form.remove();
		});
	}
	// Add a button and the according callback
	form.append("button").attr("type", "button").html("Copy to clipboard").on("click", event => {
		let output = "let _input = " + JSON.stringify(this.data, null, "\t");
		navigator.clipboard.writeText(output);
		console.log(this.data);
	});
	// Print anniversaries (to clipboard)
	form.append("button").attr("type", "button").html("Anniversaries").on("click", event => {
		// Construct a string for output
		function get_output(date_strings) {
			let output = "";
			let first_name = true;
			for (let date_string of date_strings) {
				output += (first_name ? "" : ", ");
				output += date_string;
				first_name = false;
			}
			return output;
		}
		// Get the names of anniversary nodes
		function get_anniversary_names(anniversary_nodes) {
			let output = "";
			let first_name = true;
			for (let anniversary_node of anniversary_nodes) {
				output += (first_name ? "" : " + ");
				output += get_name(anniversary_node);
				first_name = false;
			}
			return output;
		}
		// Find anniversaries for given date strings
		function get_anniversary(date_strings, current_year) {
			let sum_of_years = 0;
			for (date_string of date_strings) {
				let year_from_string = get_year_from_string(date_string, -1);
				if (year_from_string == -1) return "";
				sum_of_years += current_year - year_from_string;
			}
			for (anniversary of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 75]) {
				if (sum_of_years == anniversary) return anniversary + " years";
			}
			return "";
		}
		// Print all anniversaries for several years
		let log = "Anniversaries:\n";
		for (let year_offset of [0, 1, 2, 3, 4, 5, 6, 7]) {
			const current_time = new Date();
			let current_year = current_time.getFullYear() + year_offset;
			log += current_year + ":\n";
			for (let node of this.dag_all.nodes()) {
				let anniversary_nodes = new Array();
				let birth_dates = new Array();
				let marriage_dates = new Array();
				if (is_member(node)) {
					// Member node -> birth day and marriage
					anniversary_nodes = [node];
				} else {
					// Family node -> birth days of parents
					let parents = Array.from(this.dag_all.parents(node));
					if (parents.length < 2) continue;
					anniversary_nodes = parents;
					let marriage_dates_set = new Set();
					for (let parent_node of parents) {
						let marriage_date = get_marriage(parent_node);
						let marriage_year = get_year_from_string(marriage_date, -1);
						if (marriage_year != -1) {
							marriage_dates_set.add(marriage_year);
							marriage_dates.push(marriage_date);
						}
					}
					if (marriage_dates_set.size != 1) marriage_dates = new Array();
				}
				for (let birth_date_node of anniversary_nodes) {
					let birth_date = get_birth_date(birth_date_node);
					birth_dates.push(birth_date);
					if (birth_date == "?") {
						birth_dates = new Array();
						break;
					}
				}
				const anniversary_names = get_anniversary_names(anniversary_nodes);
				const anniversary_birthday = get_anniversary(birth_dates, current_year);
				const anniversary_birthdays = get_output(birth_dates);
				if (anniversary_birthday != "") {
					log += "Birthday: " + anniversary_birthday + " ";
					log += anniversary_names + " (" + anniversary_birthdays + ")\n";
				}
				for (let marriage_date of marriage_dates) {
					const anniversary_marriage = get_anniversary([marriage_date], current_year);
					if (anniversary_marriage != "") {
						log += "Marriage: " + anniversary_marriage + " ";
						log += anniversary_names + " (" + marriage_date + ")\n";
						break;
					}
				}
			}
		}
		navigator.clipboard.writeText(log);
		console.log(log);
	});
	// Add node data as labels
	if (is_member(node_of_dag)) // member node
	{
		form.append("br");
		for (const [key, value] of Object.entries(node_of_dag.added_data.input)) {
			if (typeof value != "string") continue;
			form.append("input").attr("type", "text").attr("value", value).on("focusout", event => {
				// 1. Update the input data
				this.data["members"][node_of_dag.data][key] = event.target.value;
				// 2. Update the DAG node
				node_of_dag.added_data.input[key] = event.target.value;
				// 3. Update the SVG content
				this.g.selectAll("g.node").each(function(node) {
					set_multiline(d3.select(this), node);
				});
			});
			form.append("label").html(" &larr; " + key);
			form.append("br");
		}
	}
}

Familienbaum.prototype.create_info_form = function() {
	let form = this.editing_div.append("form");
	form.append("label").html("Github Project: <a href=\"https://github.com/Nicolodemus/familienbaum\">Familienbaum</a><br>");
	form.append("label").html("Based on <i>js_family_tree</i> by Benjamin W. Portner (GPLv3 license)<br>");
	form.append("label").html("Using: JavaScript library <a href=\"https://d3js.org/\">d3</a> (ISC license)<br>");
}
