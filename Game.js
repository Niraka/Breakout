/* Globals */

/* Document variables */
var canvas = document.getElementById("canvasGame");
var ctx = canvas.getContext("2d");

/* Ball variables */
var ballX;
var ballY;
var ballLastX;
var ballLastY;
var ballVelocityX; /* 1, 0 or -1 */
var ballVelocityY; /* 1, 0 or -1 */
var ballAngleMod; /* An x-axis-only speed that creates an angling effect. */

/* Paddle variables */
var paddleX;
var paddleY;
var paddleHeight;

/* Blocks variables */
var blocks;
var blockWidth;
var blockHeight;
var blockSpacing;
var numBlocks; /* This is NOT equal to numColumns*numRows as it does not include blocks that were generated as blanks. */
var blocksDestroyed; /* The number of blocks destroyed this round. */

/* Scoring */
var highScores;
var score;

/* Game properties */
var numRows;
var numColumns;
var ballRadius;
var ballSpeed;
var paddleSpeed;
var paddleWidth;
var blankFrequency;

var numLives;
var CANVAS_Y_OFFSET = 50;

/* Flags */
var gameInProgress; /* Is a game currently in progress? */
var movingLeft; /* Is the paddle moving left? */
var movingRight; /* Is the paddle moving right?*/

init();
document.onkeydown = handleInputDown;
document.onkeyup = handleInputUp;

function init()
{
	highScores = new Array(10);
	for (var i = 0; i < highScores.length; i++)
	{
		highScores[i] = 0; 
	}
	resetGame();
	restartGame();
	updateProperties();
	updateHighscores();
	return setInterval(updateGame, 10);
}

/* The game loop */
function updateGame()
{
	if (gameInProgress)
	{
		if (checkVictory() == true)
		{
			endGame("Victory");
		}
		updateBall();
		updatePaddle();
		checkCollisions();
		render();		
	}
}

function handleInputDown(event)
{
	if (!gameInProgress && (event.keyCode == '37' || event.keyCode == '39'))
	{
		gameInProgress = true;
	}
	
	if (event.keyCode == '37')
	{
		movingLeft = true;
	}
	else if (event.keyCode == '39')
	{
		movingRight = true;
	}
}

function handleInputUp(event)
{
	if (event.keyCode == '37')
	{
		movingLeft = false;
	}
	else if (event.keyCode == '39')
	{
		movingRight = false;
	}
}

function endGame(endStatus)
{
	gameInProgress = false;
	if (endStatus == "Victory")
	{
		modScore(score);
	}
	addScoreToHighScores();
	bubblesort(highScores);
	updateHighscores();
	restartGame();
}

/* Replaces the lowest value with the new score */
function addScoreToHighScores()
{
	if (score > 0 && score > getLowestValue(highScores))
	{
		highScores[(highScores.length - 1)] = score;
	}
}

function checkVictory()
{
	if (blocksDestroyed >= numBlocks)
	{
		return true;
	}
	else
	{
		return false;
	}
}

/* Inverts the velocity of the given axis (x or y) */
function invertVelocity(axis)
{
	if (axis == "x")
	{
		ballVelocityX = ballVelocityX * -1;
	}
	else if (axis == "y")
	{
		ballVelocityY = ballVelocityY * -1;
	}
}

function checkCollisions()
{
	/* Collisions with sides */
	if ((ballX - ballRadius) < 0)
	{
		ballX = 0 + ballRadius;
		invertVelocity("x");
	}
	if ((ballX + ballRadius) > canvas.width)
	{
		ballX = canvas.width - ballRadius;
		invertVelocity("x");
	}
	if ((ballY - ballRadius ) < CANVAS_Y_OFFSET)
	{
		ballY = CANVAS_Y_OFFSET + ballRadius;
		invertVelocity("y");
	}
	if ((ballY - ballRadius) > canvas.height)
	{
		modLives(-1);
		if (numLives <= 0)
		{
			endGame("Defeat");
		}
		else
		{
			moveBallTo((canvas.width / 2 - ballRadius),(paddleY - (paddleWidth / 2 ) - 100));
		}	
	}
	
	/* Collisions with paddle */	
	if (isInside(ballX, ballY, (ballRadius * 2), (ballRadius * 2), paddleX, paddleY, paddleWidth, paddleHeight))
	{
		/* Flag x/y axis for adjustments */
		var adjustY = false;
		var adjustX = false;
		if (ballVelocityY == 1 && 
			(ballY + ballRadius) > paddleY && 
			isBetween((paddleX - ballRadius), (paddleX + paddleWidth + ballRadius), ballLastX))
		{
			adjustY = true;			
		}
		if (ballVelocityX == -1 && 
			(ballX + ballRadius) > paddleX && 
			isBetween((paddleY - ballRadius), (paddleY + paddleHeight + ballRadius), ballLastY))
		{
			adjustX = true;
		}
		else if (ballVelocityX == 1 && 
				(ballX + ballRadius) < paddleX && 
				isBetween((paddleY - ballRadius), (paddleY + paddleHeight + ballRadius), ballLastY))
		{
			adjustX = true;						
		}
		
		/* Apply adjustments */
		if (adjustY == true)
		{
			ballY = ballLastY;
			invertVelocity("y");
		}
		if (adjustX == true)
		{
			ballX = ballLastX;
			invertVelocity("x");
		}
					
		/* Apply an offset if the paddle was hit near the edges */
		if (ballVelocityX == 1)
		{
			if (isBetween((paddleX + (paddleWidth / 6)), (paddleX + (paddleWidth / 2)), ballX))
			{
				modAngle(0.2);
			}
			else if (isBetween((paddleX - (paddleWidth / 2)),(paddleX - (paddleWidth / 6)), ballX))
			{
				modAngle(-0.2);
			}
		}	
		else if (ballVelocityX == -1)
		{
			if (isBetween((paddleX + (paddleWidth / 6)), (paddleX + (paddleWidth / 2)), ballX))
			{
				modAngle(-0.2);
			}
			else if (isBetween((paddleX - (paddleWidth / 2)),(paddleX - (paddleWidth / 6)), ballX))
			{
				modAngle(0.2);
			}
		}
	}

	/* Collisions with blocks */
	for (var i = 0; i < numRows; i++)
	{
		for (var j = 0; j < numColumns; j++)
		{
			if (blocks[i][j].isVoid == false)
			{	
				/* Check if a collision occurred. If yes, handle it. */
				if (isInside(ballX, ballY, (ballRadius * 2), (ballRadius * 2), blocks[i][j].x, blocks[i][j].y, blocks[i][j].width, blocks[i][j].height))
				{
					/* Flag x/y axis for adjustments */
					var adjustY = false;
					var adjustX = false;
					if (ballVelocityY == -1 && 
						(ballY - ballRadius) < (blocks[i][j].y + blocks[i][j].height) && 
						isBetween((blocks[i][j].x - ballRadius), (blocks[i][j].x + blocks[i][j].width + ballRadius), ballLastX))
					{
						adjustY = true;
					}
					else if (ballVelocityY == 1 && 
							(ballY + ballRadius) > blocks[i][j].y && 
							isBetween((blocks[i][j].x - ballRadius), (blocks[i][j].x + blocks[i][j].width + ballRadius), ballLastX))
					{
						adjustY = true;			
					}
					if (ballVelocityX == -1 && 
						(ballX - ballRadius) < (blocks[i][j].x + blocks[i][j].width) &&
						isBetween((blocks[i][j].y - ballRadius), (blocks[i][j].y + blocks[i][j].height + ballRadius), ballLastY))
					{
						adjustX = true;
					}
					else if (ballVelocityX == 1 && 
							(ballX + ballRadius) > blocks[i][j].x &&
							isBetween((blocks[i][j].y - ballRadius), (blocks[i][j].y + blocks[i][j].height + ballRadius), ballLastY))
					{
						adjustX = true;						
					}
					
					/* Apply adjustments */
					if (adjustY == true)
					{
						ballY = ballLastY;
						invertVelocity("y");
					}
					if (adjustX == true)
					{
						ballX = ballLastX;
						invertVelocity("x");
					}
					
					blocks[i][j].isVoid = true;
					increaseBallSpeed();
					blocksDestroyed++;
					modScore(10);
				}							
			}					
		}		
	}
}

/* Modifies the number of lives */
function modLives(modification)
{
	numLives = numLives + modification;
}

/* Moves the ball to the given X and Y position */
function moveBallTo(xPosition, yPosition)
{
	ballX = xPosition;
	ballY = yPosition;
	ballLastX = xPosition;
	ballLastY = yPosition;
}

/* Modifies the ballAngleMod, making sure it stays within bounds */
function modAngle(modification)
{
	if (isBetween(-1.5, 1.5, (ballAngleMod + modification)))
	{
		ballAngleMod += modification;
	}
}

/* Modifies the score */
function modScore(modification)
{
	score = score + modification;
	updateStats();
}

/* Update the paddles position */
function updatePaddle()
{
	if (movingLeft && !movingRight && paddleX > 0)
	{
		paddleX = paddleX - paddleSpeed;
	}
	else if (movingRight && !movingLeft && (paddleX + paddleWidth) < canvas.width)
	{
		paddleX = paddleX + paddleSpeed;
	}
}

/* Updates the balls position */
function updateBall()
{
	ballLastX = ballX;
	ballLastY = ballY;
	if (ballVelocityX > 0)
	{
		ballX = ballX + ballSpeed + ballAngleMod;
	}
	else
	{
		ballX = ballX - ballSpeed - ballAngleMod;
	}
	if (ballVelocityY > 0)
	{
		ballY = ballY + ballSpeed;
	}
	else
	{
		ballY = ballY - ballSpeed;
	}
}

/* Resets all variables to their default states EXCLUDING high scores and blocks */
function resetGame()
{
	ballX = canvas.width / 2 - ballRadius;
	ballY = paddleY - (paddleWidth / 2 ) - 100;
	ballSpeed = 3;
	ballLastX = ballX;
	ballLastY = ballY;
	ballVelocityX = 1;
	ballVelocityY = 1;
	blankFrequency = 10;

	paddleX = canvas.width / 2;
	paddleY = canvas.height - 30;
	paddleSpeed = 5;
	paddleHeight = 10;

	blockSpacing = 1;
	score = 0;
	gameInProgress = false;

	movingLeft = false;
	movingRight = false;
	
	/* Properties */
	setGameMode("Normal");
}

/* Restart the game. Creates a game on the board. Does NOT overwrite game configuration with default values. */
function restartGame()
{
	/* Reset variables to default state */	
	paddleX = (canvas.width / 2) - (paddleWidth / 2);
	paddleY = canvas.height - 30;
	
	ballX = canvas.width / 2;
	ballY = paddleY - (paddleWidth / 2 ) - 100;
	ballVelocityX = 1
	ballVelocityY = 1
	if (blocksDestroyed > 0)
	{
		ballSpeed = ballSpeed - (blocksDestroyed * (2 / numBlocks));
	}
	ballAngleMod = 0;
	
	blockWidth = canvas.width / numColumns;
	blockHeight = (canvas.height / 3) / numRows;
	blockSpacing = 1;
	
	numLives = 3;
	score = 0;
	numBlocks = 0;
	blocksDestroyed = 0;
	
	/* Reset blocks array */
	blocks = new Array(numRows);
	for (var i = 0; i < numRows; i++)
	{
		blocks[i] = new Array(numColumns);
	}
	
	/* Populate with blocks or empty spaces */
	var blockCode;
	for (var i = 0; i < numRows; i++)
	{
		for (var j = 0; j < numColumns; j++)
		{
			blockCode = getRandom(100);
			if (i == 0 || blockCode < blankFrequency)
			{
				blocks[i][j] = new block(j, i, blockWidth, blockHeight, blockCode, true);
			}
			else
			{
				blocks[i][j] = new block(j, i, blockWidth, blockHeight, blockCode, false);
				numBlocks++;
			}
		}
	}

	movingLeft = false;
	movingRight = false;
	gameInProgress = false;
	
	updateStats();
	render();
}

/* Constructs a block object */
/* If isVoid == true, the block is "out of the game" */
/* X and Y coordinates are the TOP-LEFT of the block */
function block(x, y, width, height, blockCode, isVoid)
{
	this.isVoid = isVoid;
	this.x = ((x * blockWidth) + ((x + 1) * blockSpacing));
	this.y = ((y * blockHeight) + ((y + 1) * blockSpacing) + CANVAS_Y_OFFSET);
	this.width = width;
	this.height = height;
}

/* Renders the canvas */
function render()
{
	clearCanvas();
	
	ctx.lineWidth = 1;
	ctx.strokeStyle="#FFFFFF";
	
	/* Draw the blocks */
	var fillColour = "116090";
	for (var i = 0; i < numRows; i++)
	{
		fillColour = parseInt(fillColour) + 7;
		ctx.fillStyle = "#" + fillColour;
		for (var j = 0; j < numColumns; j++)
		{
			if (blocks[i][j].isVoid == false)
			{
				ctx.beginPath();
				ctx.rect(blocks[i][j].x, blocks[i][j].y, blocks[i][j].width, blocks[i][j].height);
				ctx.stroke();
				ctx.fill();
			}
		}		
	}
	
	/* Draw the ball */
	ctx.fillStyle = "#FF0000";
	ctx.beginPath();
	ctx.arc(ballX, ballY, ballRadius, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.fill();	
	
	/* Draw the paddle */
	ctx.fillStyle = "#9900FF";
	ctx.beginPath();
	ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
	ctx.stroke();
	ctx.fill();
	
	/* Draw top-border and lives */
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#FFFFFF";
	ctx.beginPath();
	ctx.moveTo(0, CANVAS_Y_OFFSET);
	ctx.lineTo(canvas.width, CANVAS_Y_OFFSET);
	ctx.stroke();
	
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "26px Arial";
	ctx.fillText(("Lives remaining: " + numLives), 220, 32);
	
}

/* Adds speed depending on the number of bricks. Stops the ball from reaching a ridiculous
speed when playing with a lot of bricks and/or high base speed. */
function increaseBallSpeed()
{
	ballSpeed = ballSpeed + (2 / numBlocks);
}

/* Sets the game properties to a predefined state based on gameMode parameter */
function setGameMode(gameMode)
{
	if (!gameInProgress)
	{
		switch(gameMode)
		{
			case "VEasy":
				numRows = 6;
				numColumns = 6;
				ballRadius = 20;
				ballSpeed = 1.25;
				paddleSpeed = 7;
				paddleWidth = 200;
				paddleBounciness = 0.1;
				blankFrequency = 30;
				break;
			case "Easy":
				numRows = 8;
				numColumns = 8;
				ballRadius = 16;
				ballSpeed = 1.5;
				paddleSpeed = 7;
				paddleWidth = 200;
				paddleBounciness = 0.1;
				blankFrequency = 20;
				break;
			case "Normal":
				numRows = 10;
				numColumns = 10;
				ballRadius = 12;
				ballSpeed = 2;
				paddleSpeed = 4;
				paddleWidth = 180;
				paddleBounciness = 0.1;
				blankFrequency = 15;
				break;
			case "Hard":
				numRows = 12;
				numColumns = 12;
				ballRadius = 10;
				ballSpeed = 2.5;
				paddleSpeed = 5;
				paddleWidth = 160;
				paddleBounciness = 0.1;
				blankFrequency = 10;
				break;
			case "VHard":
				numRows = 14;
				numColumns = 14;
				ballRadius = 7;
				ballSpeed = 3.5;
				paddleSpeed = 6;
				paddleWidth = 140;
				paddleBounciness = 0.1;
				blankFrequency = 5;
				break;
			default:
		}
		updateProperties();
		restartGame();
	}
}

/* Modifies the property by a fixed increase/decrease specified by propertyName parameter */
function modProperty(propertyName, modificationType)
{
	if (!gameInProgress)
	{
		switch(propertyName)
		{
			case "BrickRow":
				if (modificationType == "Inc" && numRows < 14)
				{
					numRows += 1;
				}	
				else if (modificationType == "Dec" && numRows > 2)
				{
					numRows -= 1;
				}
				break;
			case "BrickCol":
				if (modificationType == "Inc" && numColumns < 15)
				{
					numColumns += 1;
				}	
				else if (modificationType == "Dec" && numColumns > 1)
				{
					numColumns -= 1;
				}
				break;
			case "BallSize":
				if (modificationType == "Inc" && ballRadius < 20)
				{
					ballRadius += 1;
				}	
				else if (modificationType == "Dec" && ballRadius > 5)
				{
					ballRadius -= 1;
				}
				break;
			case "BallSpeed":
				if (modificationType == "Inc" && ballSpeed < 5.0)
				{
					ballSpeed += 0.25;
				}	
				else if (modificationType == "Dec" && ballSpeed > 0.5)
				{
					ballSpeed -= 0.25;
				}
				break;
			case "PaddleSize":
				if (modificationType == "Inc" && paddleWidth < 300)
				{
					paddleWidth += 20;
				}	
				else if (modificationType == "Dec" && paddleWidth > 40)
				{
					paddleWidth -= 20;
				}
				break;
			case "PaddleSpeed":
				if (modificationType == "Inc" && paddleSpeed < 10)
				{
					paddleSpeed += 0.5;
				}	
				else if (modificationType == "Dec" && paddleSpeed > 0.5)
				{
					paddleSpeed -= 0.5;
				}
				break;
			case "BrickBlanks":
				if (modificationType == "Inc" && blankFrequency < 95)
				{
					blankFrequency += 5;
				}	
				else if (modificationType == "Dec" && blankFrequency > 0)
				{
					blankFrequency -= 5;
				}
				break;
			default:
				break;
		}
		updateProperties();
		restartGame();
	}
}

/* Updates ALL property displays. Inefficient for properties that haven't changed but
   the performance drop is really negligible. Easier to read like this. */
function updateProperties()
{
	var element;

	element = document.getElementById("propertyBrickRows");
	element.firstChild.nodeValue = "Brick rows: " + (numRows - 1);
	element = document.getElementById("propertyBrickColumns");
	element.firstChild.nodeValue = "Brick columns: " + numColumns;
	
	element = document.getElementById("propertyBallSize");
	element.firstChild.nodeValue = "Ball size: " + ballRadius;
	element = document.getElementById("propertyBallSpeed");
	element.firstChild.nodeValue = "Ball speed: " + round(ballSpeed);
	
	element = document.getElementById("propertyPaddleSize");
	element.firstChild.nodeValue = "Paddle size: " + paddleWidth;
	element = document.getElementById("propertyPaddleSpeed");
	element.firstChild.nodeValue = "Paddle speed: " + round(paddleSpeed);
	element = document.getElementById("propertyBrickBlanks");
	element.firstChild.nodeValue = "Blank frequency: " + blankFrequency;
}

/* Updates the values in the high scores section */
function updateHighscores()
{
	var element;
	for (var i = 0; i < highScores.length; i++)
	{
		element = document.getElementById("highScoresBox" + i);
		if (highScores[i] != 0)
		{
			element.firstChild.nodeValue = highScores[i];
		}
		else
		{
			element.firstChild.nodeValue = "";
		}
	}
}

/* Updates the stats above the canvas */
function updateStats()
{
	var element;
	element = document.getElementById("score");
	element.firstChild.nodeValue = "Score: " + score;
	element = document.getElementById("completion");
	element.firstChild.nodeValue = "Completion: " + blocksDestroyed + "/" + numBlocks;
}

/* Clears all graphics from the canvas */
function clearCanvas()
{
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========== UTILITY FUNCTIONS =============== */

/* Returns the lowest value from an array of numerical values */
function getLowestValue(values)
{
	var lowest = values[0];
	for (var i = 0; i < values.length; i++)
	{
		if (values[i] < lowest)
		{
			lowest = values[i];
		}
	}
	return lowest;
}

/* BUBBLE SORT <3 */
function bubblesort(myArray)
{
	var hasSwapped;
	do
	{
		hasSwapped = false;
		for (var i = 0; i < myArray.length; i++)
		{
			if (myArray[i] < myArray[(i + 1)])
			{
				hasSwapped = true;
				var tempVal = myArray[i];
				myArray[i] = myArray[(i + 1)];
				myArray[(i + 1)] = tempVal;
			}
		}
	}
	while(hasSwapped);
	
	return myArray;
}

/* A convenient round-when-necessary method */
function round(value)
{
	value = +value.toFixed(3)
	return value;
}

/* Return true if two boxes intersect each other */
function isInside(srcX, srcY, srcW, srcH, tarX, tarY, tarW, tarH)
{
	if (isBetween(tarX - (srcW / 2), tarX + tarW + (srcW / 2), srcX))
	{
		if (isBetween(tarY - (srcH / 2), tarY + tarH + (srcH / 2), srcY))
		{
			return true;
		}
		else
		{
			return false;
		}
	}
	else
	{
		return false;
	}
}

/* Returns true if the given value is between the upper and lower bound (exclusive) */
function isBetween(lowerBound, upperBound, value)
{
	return (lowerBound < value && value < upperBound);
}

/* Get a random value between 0 and the maximum value (inclusive) */
function getRandom(maxValue)
{
	maxValue++;
	return Math.floor((Math.random() * maxValue));		
}