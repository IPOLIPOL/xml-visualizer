async function loadXMLFiles(files, orientation) {
    let parser = new DOMParser();
    let trees = [];
    for (let file of files) {
        let response = await fetch(file);
        let text = await response.text();
        let xml = parser.parseFromString(text, "application/xml");
        trees.push(xmlToJSON(xml.documentElement));
    }
    let combinedTree = { name: "OSS", children: trees };
    renderTree(combinedTree, orientation);
}

function xmlToJSON(xml) {
    let nodeName = xml.getAttribute("name") || xml.nodeName;
    let obj = { name: nodeName, children: [] };
    for (let node of xml.children) {
        obj.children.push(xmlToJSON(node));
    }
    return obj;
}

function renderTree(data, orientation) {
    // Base dimensions and margins
    const margin = {top: 50, right: 120, bottom: 50, left: 120};
    let baseWidth = 960 - margin.left - margin.right;
    let baseHeight = 600 - margin.top - margin.bottom;
    
    // Create the root hierarchy
    let root = d3.hierarchy(data);
    
    // Get the max depth for initial sizing
    let maxDepth = root.height;
    
    // Calculate initial SVG size
    let width, height;
    if (orientation === "horizontal") {
        // For horizontal layout, width depends on tree depth
        width = Math.max(baseWidth, maxDepth * 200);
        height = baseHeight;
    } else {
        // For vertical layout, height depends on tree depth
        width = baseWidth;
        height = Math.max(baseHeight, maxDepth * 150);
    }
    
    // Setup SVG with dynamic dimensions
    let svg = d3.select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Clear existing content
    svg.selectAll("*").remove();
    
    // Create a tree layout
    let treeLayout = d3.tree()
        .size(orientation === "horizontal" ? 
            [height, width] : 
            [width, height]);
    
    // Initialize the counter used to generate unique ids
    let i = 0;
    
    // Set initial positions
    root.x0 = orientation === "horizontal" ? height / 2 : width / 2;
    root.y0 = 0;
    
    // Initially collapse all nodes except the root
    root.children.forEach(collapse);
    
    // Call update to render the initial tree
    update(root);
    
    // Function to toggle node expansion/collapse
    function toggleNode(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
    
    // Function to collapse a node and all its descendants
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }
    
    // Function to update the tree visualization
    function update(source) {
        // Compute the new tree layout
        treeLayout(root);
        let nodes = root.descendants();
        let links = root.links();
        
        // Calculate the maximum depth of expanded nodes
        let currentMaxDepth = 0;
        nodes.forEach(d => {
            currentMaxDepth = Math.max(currentMaxDepth, d.depth);
        });
        
        // Dynamically adjust SVG size based on the current expanded tree
        let newWidth, newHeight;
        
        if (orientation === "horizontal") {
            // For horizontal layout, width depends on tree depth
            newWidth = Math.max(baseWidth, currentMaxDepth * 200);
            newHeight = Math.max(baseHeight, nodes.length * 20); // Adjust height based on number of nodes
        } else {
            // For vertical layout, height depends on tree depth
            newWidth = Math.max(baseWidth, nodes.length * 20); // Adjust width based on number of nodes
            newHeight = Math.max(baseHeight, currentMaxDepth * 150);
        }
        
        // Update SVG dimensions
        d3.select("svg")
            .attr("width", newWidth + margin.left + margin.right)
            .attr("height", newHeight + margin.top + margin.bottom);
        
        // Update tree layout size
        treeLayout.size(orientation === "horizontal" ? 
            [newHeight, newWidth] : 
            [newWidth, newHeight]);
        
        // Recompute the layout with new dimensions
        treeLayout(root);
        
        // Normalize for fixed-depth
        nodes.forEach(d => {
            d.y = d.depth * (orientation === "horizontal" ? 200 : 150);
        });
        
        // ****************** Nodes section ****************
        
        // Update the nodes...
        let node = svg.selectAll(".node")
            .data(nodes, d => d.id || (d.id = ++i));
        
        // Enter any new nodes at the parent's previous position
        let nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${orientation === "horizontal" ? source.y0 : source.x0},${orientation === "horizontal" ? source.x0 : source.y0})`)
            .on("click", (event, d) => toggleNode(d));
        
        // Add Circle for the nodes
        nodeEnter.append("circle")
            .attr("r", 6)
            .style("fill", d => d._children ? "lightsteelblue" : "#fff")
            .style("stroke", "steelblue")
            .style("stroke-width", 1.5)
            .style("cursor", "pointer");
        
        // Add labels for the nodes
        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", d => orientation === "horizontal" ? 
                (d.children || d._children ? -13 : 13) : 0)
            .attr("y", d => orientation === "horizontal" ? 
                0 : (d.children || d._children ? -13 : 13))
            .attr("text-anchor", d => orientation === "horizontal" ? 
                (d.children || d._children ? "end" : "start") : "middle")
            .text(d => d.data.name)
            .style("font-size", "12px");
        
        // UPDATE
        let nodeUpdate = nodeEnter.merge(node);
        
        // Transition to the proper position for the nodes
        nodeUpdate.transition()
            .duration(500)
            .attr("transform", d => `translate(${orientation === "horizontal" ? d.y : d.x},${orientation === "horizontal" ? d.x : d.y})`);
        
        // Update the node attributes and style
        nodeUpdate.select("circle")
            .attr("r", 6)
            .style("fill", d => d._children ? "lightsteelblue" : "#fff");
        
        // Remove any exiting nodes
        let nodeExit = node.exit().transition()
            .duration(500)
            .attr("transform", d => `translate(${orientation === "horizontal" ? source.y : source.x},${orientation === "horizontal" ? source.x : source.y})`)
            .remove();
        
        // On exit reduce the node circles size to 0
        nodeExit.select("circle")
            .attr("r", 0);
        
        // On exit reduce the opacity of text labels
        nodeExit.select("text")
            .style("fill-opacity", 0);
        
        // ****************** links section ****************
        
        // Update the links...
        let link = svg.selectAll(".link")
            .data(links, d => d.target.id);
        
        // Enter any new links at the parent's previous position
        let linkEnter = link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", d => {
                let o = {
                    x: orientation === "horizontal" ? source.x0 : source.y0,
                    y: orientation === "horizontal" ? source.y0 : source.x0
                };
                return diagonal(o, o, orientation);
            })
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-width", "1.5px");
        
        // UPDATE
        let linkUpdate = linkEnter.merge(link);
        
        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(500)
            .attr("d", d => diagonal(d.source, d.target, orientation));
        
        // Remove any exiting links
        link.exit().transition()
            .duration(500)
            .attr("d", d => {
                let o = {
                    x: orientation === "horizontal" ? source.x : source.y,
                    y: orientation === "horizontal" ? source.y : source.x
                };
                return diagonal(o, o, orientation);
            })
            .remove();
        
        // Store the old positions for transition
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    
    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d, orientation) {
        if (orientation === "horizontal") {
            return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                      ${(s.y + d.y) / 2} ${d.x},
                      ${d.y} ${d.x}`;
        } else {
            return `M ${s.x} ${s.y}
                    C ${s.x} ${(s.y + d.y) / 2},
                      ${d.x} ${(s.y + d.y) / 2},
                      ${d.x} ${d.y}`;
        }
    }
}


