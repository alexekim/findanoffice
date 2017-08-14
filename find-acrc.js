// JavaScript Documentvar map;
var mapGeocoder;

var mapStates = [];
var mapPoints = [];
var mapMarkers = [];
var mapResPaging = {
	'perPage': 10,
	'pages': 0,
	'results': 0,
	'currentPage': 0
};

$(document).ready( function() {
	$('#state-search-bttn').click( function() {
		mapSearch();
	});
	$('#zip-search-bttn').click( function() {
		mapSearch();
	});
	mapInit();
});

function mapInit() {
	// Display map
	mapGeocoder = new google.maps.Geocoder();
	var mapOptions = {
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		overviewMapControl: true
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	mapShowUS();

	// Init
	var filterZip = ($('#filter-zip').text()).split('|||');
	var filterState = ($('#filter-state').text()).split('|||');

	// Build markers list
	$('.mapMarker').each( function(index) {
		var pointInfo = $(this).text().split('|||');
		var email = $.trim(pointInfo[10]);
		var locstates = $.trim(pointInfo[12]);

		if (locstates != '')
			locstates = locstates.substr(1);
		else
			locstates = $.trim(pointInfo[7]);

		// Map points
		var mapPoint = {
			'display': 1,
			'id': pointInfo[0],
			'lat': pointInfo[1],
			'lng': pointInfo[2],
			'title': $.trim(pointInfo[3]),
			'street': $.trim(pointInfo[4]),
			'city': $.trim(pointInfo[5]),
			'zip': $.trim(pointInfo[6]),
			'state': $.trim(pointInfo[7]),
			'phone1': $.trim(pointInfo[8]),
			'fax': $.trim(pointInfo[9]),
			'email': email.replace('(at)', '@'),
			'url': $.trim(pointInfo[11]),
			'locstates': locstates,
			'address2': $.trim(pointInfo[13]),
			'institution': $.trim(pointInfo[14]),
			'investigators': $.trim(pointInfo[15]),
			'investigators_url': $.trim(pointInfo[16])
		};
		mapPoints.push(mapPoint);

		// Map markers
		var mapPosition = new google.maps.LatLng(mapPoint.lat, mapPoint.lng);
		var mapMarker = new google.maps.Marker({
			position: mapPosition,
			map: map,
			title: mapPoint.title
		});
		mapMarkerInfoWindow(mapPoint, mapMarker);
		mapMarkers.push(mapMarker);
	});

	// Show results
	if ((filterState[0]).length == 2) { // State search
		$('.selectstates #' + filterState[0]).attr('checked', true);
		$('.states-checked').html(filterState[1]);
	}
	if (filterZip.length == 2) {
		if (filterZip[0].length > 4) {
			$('#zip').val(filterZip[0]);
			$('#radius').val(filterZip[1]);
		}
	}
	mapSearch();
}

function mapFormatAddress(type, mapPoint) {
	var info = '';

	if (type == 'InfoWindow')
		info += '<strong><a href="' + mapPoint.url + '">' + mapPoint.title + '</a></strong><br />';

	if (mapPoint.institution != '') {
		info += mapPoint.institution + '<br />' ;
	}

	if (mapPoint.street != '' || mapPoint.address2 != '') {
		var commaStr = (mapPoint.street != '' && mapPoint.address2 != '') ? ', ' : ' ';
		info += mapPoint.street + commaStr + mapPoint.address2;
	}

	if (mapPoint.city != '' || mapPoint.state != '' || mapPoint.zip != '') {
		var commaStr = (mapPoint.city != '' && (mapPoint.state != '' || mapPoint.zip != '')) ? ', ' : ' ';
		info += '<br />' + mapPoint.city + commaStr + mapPoint.state + ' ' +  mapPoint.zip;
	}

	if (mapPoint.phone1 != '') {
		info += '<br />' + mapPoint.phone1 + ' (tel)';
	}

	if (mapPoint.fax != '')
		info += '<br />' + mapPoint.fax + ' (fax)';

	if (mapPoint.email != '') {
		info += '<br /><a href="mailto:' + mapPoint.email + '">' + mapPoint.email + '</a>';
	}

	if (mapPoint.investigators != '') {
		info += '<br /><strong>Principal Investigator:</strong><br /><a href="' + mapPoint.investigators_url + '">' + mapPoint.investigators + '</a>';
	}

	return info;
}

function mapMarkerInfoWindow(mapPoint, mapMarker) {
	var info = mapFormatAddress('InfoWindow', mapPoint);

	var infoWindow = new google.maps.InfoWindow({
		content: info
	});

	google.maps.event.addListener(mapMarker, 'click', function() {
		infoWindow.open(map, mapMarker);
	});
}

function mapDrawMarkers() {
	for (var i = 0 ; i < mapPoints.length ; i++) {
		if (mapPoints[i].display == 1) {
			mapMarkers[i].setMap(map);
		}
	}
}

function mapDrawAllMarkers() {
	for (var i = 0 ; i < mapPoints.length ; i++) {
		mapPoints[i].display = 1;
		mapMarkers[i].setMap(map);
	}
	mapShowUS();
}

function mapShowUS() {
	var centerLocation = new google.maps.LatLng(38.065392,-97.91015); // US map center
	map.setZoom(4);
	map.setCenter(centerLocation);
}

function mapGetStates() {
	mapStates = [];

	$('.selectstates input[type=checkbox]').each(function(index) {
		if($(this).is(':checked')){
			mapStates.push($(this).attr('id'));
		}
	});
}

function mapSearch() {
	// Init
	mapGetStates();
	var address = $('#zip').val();

	// Processing
	if (mapStates.length > 0) {
		mapStateFilter();
	}
	else if (address != '') {
		mapGeocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK)
				mapZipFilter(results[0].geometry.location);
			else
				alert('Error retrieving Zip code position.');
		});
	}
	else {
		mapResPaging.results = mapPoints.length;
		mapInitPaging();
		mapDrawAllMarkers();
		mapBuildResults();
	}
}

function mapClearMarkers() {
	for (var i = 0 ; i < mapPoints.length ; i++) {
		if (mapPoints[i].display == 1) {
			mapPoints[i].display = 0;
			mapMarkers[i].setMap(null);
		}
	}
}

function mapStateFilter() {
	// Init
	mapClearMarkers();
	mapResPaging.results = 0;

	// Find locations in radius
	for (var i = 0 ; i < mapPoints.length ; i++) {
		var locstates = (mapPoints[i].locstates).split(',');
		for (var j = 0 ; j < locstates.length ; j++) {
			var state = locstates[j];
			if ($.inArray(state, mapStates) > -1) {
				mapResPaging.results++;
				mapPoints[i].display = 1;
				break;
			}
		}
	}
	mapShowUS();

	// Show markers
	mapDrawMarkers();
	mapInitPaging();
	mapBuildResults();
}

function mapZipFilter(location) {
	var radius = $('#radius').val();

	// Init
	mapClearMarkers();
	mapResPaging.results = 0;

	// Find locations in radius
	for (var i = 0 ; i < mapPoints.length ; i++) {
		mapPoint = mapPoints[i];
		if (mapCalcDistance(mapPoint.lat, mapPoint.lng, location.lat(), location.lng()) <= radius) {
			mapResPaging.results++;
			mapPoints[i].display = 1;
		}
	}
	map.setZoom(9);
	map.setCenter(location);

	// Show markers
	mapDrawMarkers();
	mapInitPaging();
	mapBuildResults();
}

function mapCalcDistance(lat1, lng1, lat2, lng2) {
	var R = 3959; // 3959 - Radius of the earth in miles, 6371 - Radius of the earth in km

	// Processing
	var dLat = toRad(lat2-lat1);
	var dlng = toRad(lng2-lng1);
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
			Math.sin(dlng/2) * Math.sin(dlng/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return R * c;
}

function toRad(val) {
	// Converts numeric degrees to radians
	return val * Math.PI / 180;
}

function mapInitPaging() {
	mapResPaging.currentPage = 1;
	if (mapResPaging.results > 0) {
		mapResPaging.pages = Math.ceil(mapResPaging.results / mapResPaging.perPage);
	}
}

function mapBuildResults() {
	var html = '';
	var resultsSkip = 0;
	var resultsCount = 0;
	var resultsSection = $('#map-results');
	var blnOk = false;

	// Init
	resultsSkip = (mapResPaging.currentPage - 1) * mapResPaging.perPage;

	// Processing
	for (var i = 0 ; i < mapPoints.length ; i++) {
		var mapPoint = mapPoints[i];
		if (mapPoint.display == 1) {
			blnOk = true;

			if (resultsSkip > 0) {
				blnOk = false;
				resultsSkip--;
			}

			if (blnOk) {
				resultsCount++;
				html += mapResultCell(mapPoint);
			}
			if (resultsCount == mapResPaging.perPage) {
				break;
			}
		}
	}
	if (html == '')
		html = '<span class="plm">No matches</span>';
	else {
		var pagingSection = mapBuildPagingSection();
		html = pagingSection + '<ul class="group-results">' + html + '</ul>' + pagingSection;
	}

	resultsSection.html(html);
	resultsSection.fadeIn();
}

function mapResultCell(mapPoint) {
	var leftSide = '<a href="' + mapPoint.url + '">' + mapPoint.title + '</a>';
	var rightSide = mapFormatAddress('Page', mapPoint);
	var html =
	'<li>' +
		'<div class="info">' +
			'<strong>' + leftSide + '</strong><br />' +
		'</div>' +
		'<div class="description">' +
			'<p>' + rightSide + '</p>' +
		'</div>' +
	'</li>';
	return html;
}

function mapBuildPagingSection() {
	var html = '';

	if (mapResPaging.pages > 1) {
		for (var i = 1 ; i <= mapResPaging.pages ; i++) {

			var pLink = (i == mapResPaging.currentPage) ? '<li>' + i + '</li>' : '<li><a href="#" onclick="return mapJumpToPage(' + i + ');">' + i + '</a></li>';
			html += pLink;
		}

		if (mapResPaging.currentPage > 1) {
			html = '<li><a href="#" onclick="return mapJumpToPage(' + (mapResPaging.currentPage - 1) + ');">Previous</a></li>' + html;
		}
		if (mapResPaging.currentPage < mapResPaging.pages) {
			html += '<li><a href="#" onclick="return mapJumpToPage(' + (mapResPaging.currentPage + 1) + ');">Next</a></li>';
		}

		html = '<ul class="pages">' + html + '</ul>';
	}

	html =
	'<div class="pagination">' +
		'<div class="resultsnum">' + mapResPaging.results + ' result' + (mapResPaging.results > 1 ? 's' : '') + ' matching your search</div>' +
		html +
	'</div>';
	return html;
}

function mapJumpToPage(id) {
	mapResPaging.currentPage = id;
	mapBuildResults();

	return false; // Prevent a href click
}
