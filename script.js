async function getData(ajaxurl) { 
  return $.ajax({
    url: ajaxurl,
    type: 'GET',
  });
};

async function getProductInfo(ajaxurl, productId)
{
    const itemData = await getData(ajaxurl);
    var categoryName =  $('.breadcrumbs', itemData).children('a').eq(2).text();
    var price = $('.price meta', itemData).attr('content');
    
    return {url : ajaxurl, category : categoryName, id : productId, price : price};
}

async function buildMoneyPerMonthChart(priceItems, productList)
{
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    let maxDate = new Date(-8640000000000000);
    let minDate = new Date(8640000000000000);
    for(let i=0;i<priceItems.length;i++)
    {
        if(priceItems[i].date >= maxDate )
            maxDate = priceItems[i].date;
        
        if(priceItems[i].date <= minDate)
            minDate = priceItems[i].date;
    }
    
    var monthNumber = (maxDate.getMonth()+maxDate.getFullYear()*12) - (minDate.getMonth()+minDate.getFullYear()*12);
    
    var bascketPoints = [];
    for(let m=0;m<=monthNumber;m++)
    {
        var currDate = new Date(minDate.getFullYear(), minDate.getMonth()+m, 1);        
        
        var monthBascket = 0;
        for(let k=0;k<priceItems.length;k++)
        {
            if(priceItems[k].date.getMonth() === currDate.getMonth() && priceItems[k].date.getFullYear() === currDate.getFullYear())            
                monthBascket += priceItems[k].price;            
        }
        var title = monthNames[currDate.getMonth()]+' '+currDate.getFullYear().toString();
        bascketPoints.push( { label : title, y : monthBascket } );  
    }

    var options = {
	animationEnabled: true,
	title: {
		text: 'Расходы в месяц'
	},
	axisY: {
		title: 'расходы',
		suffix: 'р',
		includeZero: false
	},
	axisX: {
		title: 'Месяцы'
	},
	data: [{
		type: 'column',
		dataPoints: bascketPoints
	}]
    };
    
    $('#chartContainer').CanvasJSChart(options);
}

function buildPriceChangeChart(priceItems, productList)
{
    var productChartModel = [];

    var maxPriceChangeRate = 0;
    for(const product of productList)
    {
        var productPoints = [];
        
        var productMaxPrice = -Infinity;
        var productMinPrice = Infinity;
        var productName = '';        
    
        for(const priceItem of priceItems)
        {
            if(product.id === priceItem.id)
            {   
                
                if(!isNaN(parseFloat(product.price)) && productPoints.length === 0)
                {
                    var productPrice = parseFloat(product.price);
                    productPoints.push({y : productPrice, x : new Date() });
                }   
                
                productName = priceItem.title;
                var pricePerQuantity = priceItem.price/priceItem.quantity;
                productPoints.push({y : pricePerQuantity, x : priceItem.date});
                
                if(pricePerQuantity <= productMinPrice)
                    productMinPrice = pricePerQuantity;
                
                if(pricePerQuantity >= productMaxPrice)
                    productMaxPrice = pricePerQuantity;
            }
        }
        
        var priceChangeRate = (productMaxPrice - productMinPrice)/productMaxPrice;
        
        if(priceChangeRate >= maxPriceChangeRate)
            maxPriceChangeRate = priceChangeRate;
        
        productChartModel.push( {label : productName+ ' арт. '+product.id, name: productName, points : productPoints, priceChangeRate : priceChangeRate } );
    }    

    var firstProduct = productChartModel.find(x=>x.priceChangeRate === maxPriceChangeRate);
    
    $('#productDropDown').autocomplete({
        source: productChartModel,
        minLength: 2,
        focus: function(event, ui) {            
            return false;  
        },
        select: function(event, ui) {
            $('#productDropDown').val( ui.item.name );
            drawPriceChangeChart(ui.item.points, ui.item.name);
            return false;
        }
    });    
    
    
    $('#productDropDown').val(firstProduct.name);
    $('#productDropDown').dblclick(function() { $('#productDropDown').val(''); });

    drawPriceChangeChart(firstProduct.points, firstProduct.name);        
}

function drawPriceChangeChart(dataPoints, productName)
{
        var options = {
	animationEnabled: true,
	theme: 'light2',
	title:{
		text: 'Динамика цены товара'
	},
	axisX:{
		valueFormatString: 'DD MMM'
	},
	axisY: {
		title: 'Цена товара, р',
		suffix: 'р',
		minimum: 0
	},
	toolTip:{
		shared:true
	},  
	legend:{
		cursor:'pointer',
		verticalAlign: 'bottom',
		horizontalAlign: 'left',
		dockInsidePlotArea: true,
	},
	data: [{
		type: 'line',
		showInLegend: true,
		name: productName,
		markerType: 'square',
		xValueFormatString: 'DD MMM, YYYY',
		color: '#F08080',
		yValueFormatString: '0.00',
		dataPoints: dataPoints
        }]
    };
    
    $('#priceChangeChartContainer').CanvasJSChart(options);
}

function findCategory(productList, productUrl)
{
    for(let j=0;j<productList.length;j++)
    {
        if(productList[j].url === productUrl)        
            return productList[j].category;        
    }
}

function buildMoneyPerCategory(priceItems, productList)
{    
    var categories = [];
    var itemSumm = 0;
    for(let i=0;i<priceItems.length;i++)
    {
        var productPriceItem = priceItems[i];
        
        if(isNullOrEmpty(productPriceItem.url))
            continue;
        
        var category = findCategory(productList, productPriceItem.url);
        
        if(isNullOrEmpty(category))
            continue;
        
        if(typeof categories[category] === 'undefined')
            categories[category] = 0;
        
        categories[category] += productPriceItem.price;       
        itemSumm += productPriceItem.price;
    }
    
    
    var dataPoints = [];
    for (curCategory in categories) 
    {
        dataPoints.push( {label:curCategory, y: (100*categories[curCategory]/itemSumm).toFixed(2) } );
    }
    
    var options = {
	title: {
		text: 'Расходы по категориям'
	},
	data: [{
			type: 'pie',
			startAngle: 45,
			showInLegend: 'true',
			legendText: '{label}',
			indexLabel: '{label} ({y})',
			yValueFormatString:'0.0',
			dataPoints: dataPoints
	}]
    };
    
    $('#chartContainerPie').CanvasJSChart(options);
}

function parseDate(dateString)
{
    var monthNames2 = ['января', 'февраля', 'марта','апреля', 'мая','июня','июля','августа','сентября', 'октября','ноября','декабря'];
    var parts = dateString.split(' ',3);
    var day = parts[0];
    var month = monthNames2.indexOf(parts[1]);
    var year = parts[2];
    return new Date(year, month, day);
}

function main()
{
    if(window.location.hostname!=='e-dostavka.by')
        {
            alert('Скрипт работает только на e-dostavka.by');
            return;
        }
    
    $('.wrapper').html('<a id=startButton class=ui-button style=font-size:250%;margin:100px;20px; onclick=javascript:buildStat() href=#>Собрать статистику</a>'+
                '<div id=progresscontainer style=margin:100px;20px;display:none;font-size:14px;><div id=messageBox style=font-size:16px;font-color:#a01919></div><div id=progressbar></div></div>'+
                '<div id=answerContainer style=display:none;>'+
                    '<div style=margin:30px;5px;><div id=chartContainer style=height:370px;width:100%;></div></div>'+                
                    '<div style=margin:30px;5px;><div id=chartContainerPie style=height:370px;width:100%;></div></div>'+
                    '<div style=margin:30px;5px;><div style=width:100%;><label for=productDropDown style=min-width:100px;font-size:16px;width:20%;>Продукт: </label>'+
                        '<input id=productDropDown style=width:80%;></div>'+
                    '<div id=priceChangeChartContainer style=height:370px;width:100%;></div></div>'+                   
                '</div>'+
                '<script src=https://code.jquery.com/ui/1.12.1/jquery-ui.js></script>'+
                '<script src=https://canvasjs.com/assets/script/jquery.canvasjs.min.js></script>' );
}

function isNullOrEmpty(str)
{
    return typeof str === 'undefined' || str === '';
}

async function buildStat()
{
    $('#progressbar').progressbar({ value: 0 });
    $('#progresscontainer').show();
    $('#startButton').hide();
    $('#messageBox').html('Идет сбор статистики, это может занять несколько минут...');
    
    var priceItems = [];
    var productList = [];
    const historyData = await getData('https://e-dostavka.by/cabinet/history/');
    
    var numbers = $('.number a', historyData);
    var numbersCount = numbers.length;
    
    if(numbersCount === 0)
    {
        $('#messageBox').html('Нет доступа к истории заказов или история заказов пуста.');
        return;
    }
    
    for (let i=0; i<numbersCount; i++)
    {
        var bascketUrl = $(numbers[i]).attr('href');               
        const bascketData = await getData(bascketUrl)
        var progress = 100*i/numbersCount;
        $('#progressbar').progressbar({ value:  progress});

        var isDelivered = $('.fa-home', bascketData).length>0;            
        if(isDelivered)
        {
            var dateOrderRow = $('.date_order', bascketData);
            dateOrderRow.find('b').remove();
            var orderDate = parseDate(dateOrderRow.text());
            var bascketItems = $('.description', bascketData);

            for(let k=0;k<bascketItems.length;k++)
            {
                var priceSumText = $('.itog', bascketItems[k]);
                priceSumText.find('strong').remove();
                priceSumText.find('b').remove();
                var cents = $('.cent', priceSumText).text();
                priceSumText.find('span').remove();
                var rubles = priceSumText.text();
                var itemPrice = parseFloat(rubles)+parseFloat(cents)/100;
                var itemTitleHtml = $('.title', bascketItems[k]);
                var itemTitle = itemTitleHtml.text();
                var itemUrl = $('.title a', bascketItems[k]).attr('href');                
    
                var productQuantityDiv = $('.row-item', bascketItems[k]).filter(function() { return $('strong', this).text().trim() === 'Количество:'; } );
                productQuantityDiv.find('strong').remove();
                productQuantityDiv.find('span').remove();
                var productQuantity = parseFloat(productQuantityDiv.text());
                
                var productIdDiv = $('.row-item', bascketItems[k]).filter(function() { return $('strong', this).text().trim() === 'Артикул:'; } );
                productIdDiv.find('strong').remove();
                var productId = productIdDiv.text().trim();
                
                var priceItem = { date : orderDate, title: itemTitle, url : itemUrl, price: itemPrice, quantity : productQuantity, id : productId };
                
                if(productList.filter(e => e.id === productId).length === 0 && !isNullOrEmpty(itemUrl))
                {
                    const productInfo = await getProductInfo(itemUrl, productId);
                    productList.push(productInfo);
                }
                
                priceItems.push(priceItem);
            }
            
        }
    }
    
    
    $('#progresscontainer').hide();
    $('#answerContainer').show();
    buildMoneyPerMonthChart(priceItems, productList);
    buildMoneyPerCategory(priceItems, productList);
    buildPriceChangeChart(priceItems, productList);

};

main();
