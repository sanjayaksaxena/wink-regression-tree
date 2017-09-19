//     wink-regression-tree
//     Decision Tree to predict the value of a continuous
//     target variable
//
//     Copyright (C) 2017  GRAYPE Systems Private Limited
//
//     This file is part of “wink-regression-tree”.
//
//     “wink-regression-tree” is free software: you can redistribute it
//     and/or modify it under the terms of the GNU Affero
//     General Public License as published by the Free
//     Software Foundation, version 3 of the License.
//
//     “wink-regression-tree” is distributed in the hope that it will
//     be useful, but WITHOUT ANY WARRANTY; without even
//     the implied warranty of MERCHANTABILITY or FITNESS
//     FOR A PARTICULAR PURPOSE.  See the GNU Affero General
//     Public License for more details.
//
//     You should have received a copy of the GNU Affero
//     General Public License along with “wink-regression-tree”.
//     If not, see <http://www.gnu.org/licenses/>.


//
var chai = require( 'chai' );
var mocha = require( 'mocha' );
var wrt = require( '../src/wink-regression-tree.js' );
var fs = require( 'fs' );

var summary = require( '../test/data/summary.json' );

var expect = chai.expect;
var describe = mocha.describe;
var it = mocha.it;

var cars = fs.readFileSync( './test/data/cars-quantized-data.csv', 'utf-8' ).split( '\n' ); // eslint-disable-line no-sync
cars.pop();

describe( 'Instantiating Wink Regression Tree', function () {
  it( 'should return an object', function () {
    expect( typeof wrt() ).to.equal( 'object' );
  } );
} );


describe( 'Run Basic Test Cycle with Quantized Car Data', function () {
  it( 'should return JSON string & metrics with variance reduction of 75.6893%', function () {
    var rt = wrt();
    // var cars = fs.readFileSync( './test/data/cars-quantized-data.csv', 'utf-8' ).split( '\n' ); // eslint-disable-line no-sync
    // cars.pop();
    var columns = [
      { name: 'model', categorical: true, exclude: true },
      { name: 'mpg', categorical: false, target: true },
      { name: 'cylinders', categorical: true },
      { name: 'displacement', categorical: true, exclude: false },
      { name: 'horsepower', categorical: true, exclude: false },
      { name: 'weight', categorical: true, exclude: false },
      { name: 'acceleration', categorical: true, exclude: false },
      { name: 'year', categorical: true, exclude: true },
      { name: 'origin', categorical: true, exclude: false  }
    ];
    var inp = { weight: 'high weight', displacement: 'large displacement', horsepower: 'high power', origin: 'US', acceleration: 'faster' };
    var f = function ( size, mean, stdev, cols, missingCol ) {
      return [ size, +mean.toFixed( 4 ), +stdev.toFixed( 4 ), cols.join( '/' ), missingCol ];
    };
    rt.defineConfig( columns, { minPercentVarianceReduction: 0.5, minLeafNodeItems: 10, minSplitCandidateItems: 30, minAvgChildrenItems: 2 } );
    cars.forEach( function ( row ) {
      rt.ingest( row.split( ',' ) );
    } );
    rt.learn();
    cars.forEach( function ( row ) {
      var r = row.split( ',' );
      rt.evaluate( { model: r[0], mpg: r[1], cylinders: r[2], displacement: r[3], horsepower: r[4], weight: r[5], acceleration: r[6], year: r[7], origin: r[8] } );
    } );
    // console.log( JSON.stringify( JSON.parse( rt.exportJSON() ), null, 2 ) ); // eslint-disable-line no-console
    expect( typeof rt.exportJSON() ).to.equal( 'string' );
    expect( rt.metrics() ).to.deep.equal( { size: 394, varianceReduction: 75.6893 } );
    // Test navigation to the deppest level of tree.
    expect( +( rt.predict( inp ) ).toFixed( 4 ) ).to.equal( 19.4048 );
    // Same test with a handller function.
    expect( rt.predict( inp, f ) ).to.deep.equal( [ 21, 19.4048, 2.4036, 'weight/displacement/horsepower/origin/acceleration', undefined ] );
    // Missing column value with handler - will give column name.
    expect( rt.predict( { weight: 'high weight' }, f ) ).to.deep.equal( [ 99, 20.5131, 4.3304, 'weight', 'displacement' ] );
    // Missing column value without the handler - will throw error.
    expect( rt.predict.bind( null, { weight: 'high weight' } ) ).to.throw( 'winkRT: missing column value for the column: "displacement"' );
  } );
} );


describe( 'Run basic edge cases', function () {
  it( 'should return JSON string, metrics with variance reduction of 0%, predict to throw error on no input', function () {
    var rt = wrt();
    // var cars = fs.readFileSync( './test/data/cars-quantized-data.csv', 'utf-8' ).split( '\n' ); // eslint-disable-line no-sync
    // cars.pop();
    var columns = [
      { name: 'model', categorical: true, exclude: false },
      { name: 'mpg', categorical: false, target: true },
      { name: 'cylinders', categorical: true, exclude: true },
      { name: 'displacement', categorical: true, exclude: true },
      { name: 'horsepower', categorical: true, exclude: true },
      { name: 'weight', categorical: true, exclude: true },
      { name: 'acceleration', categorical: true, exclude: true },
      { name: 'year', categorical: true, exclude: true },
      { name: 'origin', categorical: true, exclude: true  }
    ];
    rt.defineConfig( columns, { } );
    cars.forEach( function ( row ) {
      rt.ingest( row.split( ',' ) );
    } );
    rt.learn();
    cars.forEach( function ( row ) {
      var r = row.split( ',' );
      rt.evaluate( { model: r[0], mpg: r[1], cylinders: r[2], displacement: r[3], horsepower: r[4], weight: r[5], acceleration: r[6], year: r[7], origin: r[8] } );
    } );
    // console.log( rt.exportJSON() ); // eslint-disable-line no-console
    expect( typeof rt.exportJSON() ).to.equal( 'string' );
    expect( rt.metrics() ).to.deep.equal( { size: 394, varianceReduction: 0 } );
    // test no input to `predict()`
    expect( rt.predict.bind() ).to.throw( 'winkRT: input must be an object, instead found:' );
  } );
} );

describe( 'Import of incorrect JSON must fail', function () {
  it( 'if the input is a null json', function () {
    var rt = wrt();
    expect( rt.importJSON.bind( null, null ) ).to.throw( 'winkRT: undefined or null JSON encountered, import failed!' );
  } );

  it( 'if the input is a empty json', function () {
    var rt = wrt();
    expect( rt.importJSON.bind( null, '' ) ).to.throw( 'winkRT: undefined or null JSON encountered, import failed!' );
  } );

  it( 'if the input is an ill-formed json', function () {
    var rt = wrt();
    expect( rt.importJSON.bind( null, '{ "junk": 3, }' ) ).to.throw( 'winkRT: JSON parsing error during import:\n\tUnexpected token } in JSON at position 13' );
  } );

  it( 'if the json version is wrong', function () {
    var rt = wrt();
    expect( rt.importJSON.bind( null, '{ "version": "1.3" }' ) ).to.throw( 'winkRT: incorrect json format or tree version, import failed!' );
  } );

  it( 'if the json version key is missing', function () {
    var rt = wrt();
    expect( rt.importJSON.bind( null, '{  }' ) ).to.throw( 'winkRT: incorrect json format or tree version, import failed!' );
  } );
} );

describe( 'Generate summary of learning', function () {
  it( 'should return object matching the summary.json', function () {
    var rt = wrt();
    var columns = [
      { name: 'model', categorical: true, exclude: true },
      { name: 'mpg', categorical: false, target: true },
      { name: 'cylinders', categorical: true },
      { name: 'displacement', categorical: true, exclude: false },
      { name: 'horsepower', categorical: true, exclude: false },
      { name: 'weight', categorical: true, exclude: false },
      { name: 'acceleration', categorical: true, exclude: false },
      { name: 'year', categorical: true, exclude: true },
      { name: 'origin', categorical: true, exclude: false  }
    ];
    rt.defineConfig( columns, { minPercentVarianceReduction: 0.5, minLeafNodeItems: 10, minSplitCandidateItems: 30, minAvgChildrenItems: 2 } );
    cars.forEach( function ( row ) {
      rt.ingest( row.split( ',' ) );
    } );
    rt.learn();
    expect( typeof rt.summary() ).to.equal( 'object' );
    // console.log( JSON.stringify( rt.summary(), null, 2 ) ); // eslint-disable-line no-console
    expect( rt.summary() ).to.deep.equal( summary );
  } );
} );
