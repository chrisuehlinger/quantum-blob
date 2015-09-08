var width = window.innerWidth,
    height = window.innerHeight,
    padding = -1, // separation between same-color nodes
    clusterPadding = -11, // separation between different-color nodes
    minRadius = 15,
    maxRadius = 20,
    paused = false;

var n = 40, // total number of nodes
    m = 2; // number of distinct clusters

var color = d3.scale.linear()
    .domain([0, 1])
    .range(['red', 'blue']);

// The largest node for each cluster.
var clusters = new Array(m);

var nodes = d3.range(n).map(function (j) {
    var i = Math.floor((j / n) * m),
        r = minRadius + Math.sqrt((i + 1) / m * -Math.log(Math.random())) * (maxRadius - minRadius),
        d = {
            cluster: i,
            colorScale: i,
            radius: r,
            id: j
        };

    if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
    return d;
});

var canvas = d3.select("canvas")
    .attr("width", width)
    .attr("height", height);

var context = canvas.node().getContext("2d");


// Use the pack layout to initialize node positions.
d3.layout.pack()
    .sort(null)
    .size([width, height])
    .children(function (d) {
        return d.values;
    })
    .value(function (d) {
        return d.radius * d.radius;
    })
    .nodes({
        values: d3.nest()
            .key(function (d) {
                return d.cluster;
            })
            .entries(nodes)
    });

var force = d3.layout.force()
    .nodes(nodes)
    .size([width, height])
    .gravity(.02)
    .charge(0)
    .on("tick", tick)
    .start();

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);



var node = svg.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr('class', 'blob')
    .call(force.drag);

node.transition()
    .duration(750)
    .delay(function (d, i) {
        return i * 5;
    })
    .attrTween("r", function (d) {
        var i = d3.interpolate(0, d.radius);
        return function (t) {
            return d.radius = i(t);
        };
    });

function tick(e) {
    if (!paused) {
        node.each(cluster(10 * e.alpha * e.alpha))
            .each(collide(.1))
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })
            .attr('class', function (d) {
                return d.cluster ? 'blue' : 'red';
            })
//            .attr('title', function (d) {
//                return d.colorScale;
//            })
//            .style("fill", function (d) {
//                return color(d.colorScale);
//            });
        
        
        context.clearRect(0, 0, width, height);
        // draw nodes
        nodes.forEach(function (d) {
            context.beginPath();
            context.fillStyle = color(d.colorScale);
            context.moveTo(d.x, d.y);
            context.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
            context.fill();
        });
    }
}

// Move d to be adjacent to the cluster node.
function cluster(alpha) {
    return function (d) {
        var cluster = clusters[d.cluster];
        if (cluster === d) return;
        var x = d.x - cluster.x,
            y = d.y - cluster.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + cluster.radius;
        if (l != r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            cluster.x += x;
            cluster.y += y;
        }
    };
}

// Resolves collisions between d and all other circles.
function collide(alpha) {
    var quadtree = d3.geom.quadtree(nodes);
    return function (d) {
        var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        d.colorScale += 0.1 * (d.cluster - d.colorScale);
        quadtree.visit(function (quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
                if (l < r + 3) {
                    if (d.cluster !== quad.point.cluster)
                        d.colorScale += 0.25 * (0.5 - d.colorScale);
                    else if (Math.abs(d.colorScale - d.cluster) < Math.abs(quad.point.colorScale - quad.point.cluster))
                        d.colorScale += 0.25 * (quad.point.colorScale - d.colorScale);
                }

                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

$('.toggle-button').click(function (e) {
    console.log('paused? ' + paused);
    var $this = $(this);
    if (!paused) {
        $('html')
            .removeClass('play-sim')
            .addClass('pause-sim');

        $this
            .children('i')
            .removeClass('fa-pause')
            .addClass('fa-play');

        $($('.red')[Math.floor(Math.random() * n / m)]).addClass('show-when-paused');
        $($('.blue')[Math.floor(Math.random() * n / m)]).addClass('show-when-paused');
    } else {
        $('html')
            .removeClass('pause-sim')
            .addClass('play-sim');

        $this
            .children('i')
            .removeClass('fa-play')
            .addClass('fa-pause');

        $('.show-when-paused')
            .removeClass('show-when-paused');
    }

    paused = !paused;
});