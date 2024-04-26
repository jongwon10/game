console.clear();
var basic = 'y';
var normalBlock;
var currentMode;

var Stage = /** @class */ (function () {
    function Stage() {

        var _this = this;
        this.render = function () {
            this.renderer.render(this.scene, this.camera);
        };
        this.add = function (elem) {
            this.scene.add(elem);
        };
        this.remove = function (elem) {
            this.scene.remove(elem);
        };
        this.container = document.getElementById('game');

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#D0CBC7', 1);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();

        var aspect = window.innerWidth / window.innerHeight;
        var d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener('resize', function () { return _this.onResize(); });
        this.onResize();
    }

    Stage.prototype.setCamera = function (y, speed) {
        if (speed === void 0) { speed = 0.3; }
        TweenLite.to(this.camera.position, speed, { y: y +4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    };

    Stage.prototype.onResize = function () {
        var viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    }
    return Stage;
}());

var Block = /** @class */ (function () {
    function Block(block) {
        
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12;
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';

        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

        var randomNumber = Math.floor(Math.random() * 10) % 7;
        if (!this.targetBlock) {
            this.color = 0x333344;
        } else {
            var offset = this.index + this.colorOffset;
            var r = Math.sin(0.3 * offset) * 55 + 200;
            var g = Math.sin(0.3 * offset + 2) * 55 + 200;
            var b = Math.sin(0.3 * offset + 4) * 55 + 200;
            if (randomNumber == 2 && currentMode == 'Hard') {
                this.color = 0xFF0000;
                basic = 'n';
            }else {
                this.color = new THREE.Color(r / 255, g / 255, b / 255);
                basic = 'y';
            }
        }

        this.state = this.index > 1 ? this.STATES.ACTIVE : this. STATES.STOPPED;

        this.speed = -0.1 - (this.index * 0.005);
        if (this.speed < -4)
            this.speed = -4;
        this.direction = this.speed;

        var geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.FlatShading });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.state == this.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        } else if (this.state == this.STATES.STOPPED) {
            normalBlock = this;
        }
    }

    Block.prototype.reverseDirection = function () {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    };

    Block.prototype.place = function () {
        this.state = this.STATES.STOPPED;
        var overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        var blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };

        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true;
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }

        if (overlap > 0) {
            var choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap;
            this.dimension[this.workingDimension] = overlap;
            var placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            var placedMesh = new THREE.Mesh(placedGeometry, this.material);
            var choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            var choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
            var choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            }
            else {
                choppedPosition[this.workingPlane] += overlap;
            }
            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
            blocksToReturn.placed = placedMesh;
            if (!blocksToReturn.bonus)
                blocksToReturn.chopped = choppedMesh;
        } else {
            this.state = this.STATES.MISSED;
        }

        this.dimension[this.workingDimension] = overlap;
        
        return blocksToReturn;
        };

    Block.prototype.tick = function () {
        if (this.state == this.STATES.ACTIVE) {
            var value = this.position[this.workingPlane];
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
                this.reverseDirection();
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    };
    return Block;
}());

var Game = /** @class */ (function () {
    function Game() {
        var _this = this;
        this.STATES = {
            'LOADING': 'loading',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting',
            'STARTED': 'started',
            'ACTIVE': 'active',
            'ONREADY': 'onready',
            'ENDSCORE': 'endscore'
        };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        this.stage = new Stage();
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.bestScoreContainer = document.getElementById('bestScore');
        var normalButton = document.getElementById('normal-button');
        var hardButton = document.getElementById('hard-button');
        this.noticeStartBtn = document.getElementById('sbtn');
        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);
        this.addBlock();
        this.tick();
        this.updateState(this.STATES.READY);

        this.scoreContainer.innerHTML = currentMode + " : 0";
        this.bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;

        this.updateScoreDisplay();
        this.updateBestScoreDisplay();

        var noticePopup = document.querySelector('.nPopup');
        noticePopup.style.display = 'none';        

        // document.addEventListener('keydown', function (e) {
        //     if (_this.state === _this.STATES.PLAYING && e.keyCode === 32) {
        //         console.log('스페이스바');
        //         _this.onAction();
        //     }
        // });
        
        document.addEventListener('click', function (e) {

            if (_this.state === _this.STATES.ONREADY && e.target.id === 'sbtn') {
                console.log('sbtn');
                _this.hideNoticePopup();
                _this.startGame();
            } else if (_this.state === _this.STATES.PLAYING  && document.querySelector('.nPopup').style.display !== 'block' && document.getElementById('ePopup').style.display != 'block') {
                if (document.getElementById('ePopup').style.display !== 'block' && e.target.id !== 'noBtn') {
                console.log('좌클릭');
                _this.onAction();
                }
            }
        });

        var restartButton = document.getElementById('rBtn1');
        var closeButton = document.getElementById('cBtn');
        var isRestartClicked = false;
        var isCloseClicked = false;

        if (restartButton) {
            restartButton.addEventListener('click',function (e) {

                if (document.getElementById('goPopup').style.display === 'block') {
                    e.preventDefault();
                    return false;
                }

                if (document.querySelector('.nPopup').style.display !== 'block') {
                    if (isCloseClicked) {
                        e.preventDefault();
                        return false;
                    }
                    noticePopup.style.display = 'block';
                    isRestartClicked = true;
    
                    var currentBlock = game.blocks[game.blocks.length - 1];
                    currentBlock.state = game.STATES.STOPPED;
                    
                    document.getElementById('sbtn').addEventListener('click', function () {
                        game.restartGame();
                        noticePopup.style.display = 'none';
                        isRestartClicked = false;
                    });
    
                    document.getElementById('backBtn').addEventListener('click', function (e) {
                        e.stopPropagation();
                        normalButton.style.display = 'none';
                        hardButton.style.display = 'none';
                        location.reload();
                        isRestartClicked = false;
                    });
                }
                
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'q' && (_this.state === _this.STATES.PLAYING || _this.state === _this.STATES.ENDSCORE)) {
                if (isCloseClicked) {
                    e.preventDefault();
                    return false;
                }
                noticePopup.style.display = 'block';
                isRestartClicked = true;
                var currentBlock = game.blocks[game.blocks.length - 1];
                currentBlock.state = game.STATES.STOPPED;
        
                document.getElementById('sbtn').addEventListener('click', function () {
                    game.restartGame();
                    noticePopup.style.display = 'none';
                    isRestartClicked = false;
                });

                document.getElementById('backBtn').addEventListener('click', function (e) {
                    e.stopPropagation();
                    normalButton.style.display = 'none';
                    hardButton.style.display = 'none';
                    location.reload();
                    isRestartClicked = false;
                });
            }
        });

        if (closeButton) {
            closeButton.addEventListener('click', function (e) {
                if (document.getElementById('goPopup').style.display === 'block') {
                    e.preventDefault();
                    return false;
                }

                if (document.querySelector('.nPopup').style.display !== 'block') {
                    if (isRestartClicked) {
                        e.preventDefault();
                        return false;
                    }
    
                    isCloseClicked = true;
                    document.getElementById('ePopup').style.display = 'block';
    
                    var currentBlock = game.blocks[game.blocks.length - 1];
                    currentBlock.state = game.STATES.STOPPED;
                    console.log('Close button clicked');
                }
            });

            var continew = document.getElementById('okBtn');
            continew.addEventListener('click', function () {
                localStorage.removeItem('currentScore');
                location.reload();
            });

            var popupCloseButton = document.getElementById('noBtn');
            if (popupCloseButton) {
                popupCloseButton.addEventListener('click', function () {
                    document.getElementById('ePopup').style.display = 'none';
                    isCloseClicked = false;
                    
                    var currentBlock = game.blocks[game.blocks.length - 1];
                    currentBlock.state = game.STATES.ACTIVE;
                    console.log('Popup close button clicked');

                    game.state = game.STATES.PLAYING;
                    // game.tick();
                    // currentBlock.tick();
                });
            }
        }
        
        normalButton.addEventListener('click', function () {
            currentMode = 'Normal';
            game.updateState(game.STATES.ONREADY);
            document.getElementById('score').innerText = currentMode + ' : 0 ';
            _this.showNoticePopup();
        });

        hardButton.addEventListener('click', function () {
            currentMode = 'Hard';
            document.getElementById('score').innerText = currentMode + ' : 0 ';
            game.updateState(game.STATES.ONREADY);
            _this.showNoticePopup();
        });


        var backBtn = document.getElementById('backBtn');
        backBtn.addEventListener('click', function() {
            location.reload();
           
            noticePopup.style.display = 'none';
            // normalButton.style.display = 'block';
            // hardButton.style.display = 'block';
        });
    }

    Game.prototype.showNoticePopup = function () {
        var normalButton = document.getElementById('normal-button');
        var hardButton = document.getElementById('hard-button');
        var noticePopup = document.querySelector('.nPopup');
        normalButton.style.display = 'none';
        hardButton.style.display = 'none';
        noticePopup.style.display = 'block';      
    };

    Game.prototype.hideNoticePopup = function () {
        var normalButton = document.getElementById('normal-button');
        var hardButton = document.getElementById('hard-button');
        var noticePopup = document.querySelector('.nPopup');
        noticePopup.style.display = 'none';
        normalButton.style.display = 'none';
        hardButton.style.display = 'none';
    };

    Game.prototype.updateState = function (newState) {
        for (var key in this.STATES)
            this.mainContainer.classList.remove(this.STATES[key]);
        this.mainContainer.classList.add(newState);
        this.state = newState;
    };

    Game.prototype.onAction = function () {
        if (this.state === this.STATES.PLAYING) {
            this.placeBlock();
            this.updateScoreDisplay();
        }
    };

    function playBackgroundMusic() {
        var bgMusic = document.getElementById('gameBgm');
        if (bgMusic) {
            bgMusic.play();
        }
    }

    // 게임 종료 시 배경음악 정지 함수
    function stopBackgroundMusic() {
        var bgMusic = document.getElementById('gameBgm');
        if (bgMusic) {
            bgMusic.pause();
        }
    }

    Game.prototype.startGame = function () {
        if (this.state != this.STATES.PLAYING) {
            this.state = this.STATES.PLAYING;
            this.updateState(this.STATES.PLAYING);
            document.getElementById('score').innerText = currentMode + ' : 0 ';
            this.bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
            this.updateScoreDisplay();
            this.addBlock();
            // localStorage.removeItem('bestScore');

            playBackgroundMusic();
        }
    };

    Game.prototype.clearGroup = function(group) {
        while (group.children.length) {
            group.remove(group.children[0]);
        }
    }

    Game.prototype.restartGame = function () {
        basic = 'y';
        var _this = this;
        this.clearGroup(this.newBlocks);
        this.clearGroup(this.placedBlocks);
        this.clearGroup(this.choppedBlocks);
        this.blocks = [];
        this.updateState(this.STATES.RESETTING);
        var oldBlocks = this.placedBlocks.children;
        var removeSpeed = 0.2;
        var delayAmount = 0.02;
        var _loop_1 = function (i) {
            TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length -1) * delayAmount, ease: Power1.easeIn, onComplete: function () { return _this.placedBlocks.remove(oldBlocks[i]); } });
            TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
        };

        for (var i = 0; i < oldBlocks.length; i++) {
            _loop_1(i);
        }

        var cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
        this.stage.setCamera(2, cameraMoveSpeed);
        var countdown = { value: this.blocks.length - 1 };
        // TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: function () {_this.scoreContainer.innerHTML =  currentMode + ' : ' + String(Math.round(countdown.value)); } });
        // TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: function () {_this.bestScoreContainer.innerHTML =  'Best Score: ' + String(Math.round(countdown.value)); } });
        this.blocks = this.blocks.slice(0, 1);
        this.addBlock();
        
        
        setTimeout(function () {
            _this.startGame();
        }, cameraMoveSpeed * 1000);
    };

    Game.prototype.playBlockSound = function () {
        var blockSound = document.getElementById('blockSound');
        if (blockSound) {
            blockSound.currentTime = 0;
            blockSound.play();
        }
    };

    Game.prototype.placeBlock = function () {
        var _this = this;
        var currentBlock = this.blocks[this.blocks.length -1];
        var newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);

        if (newBlocks.placed) {
            this.placedBlocks.add(newBlocks.placed);
            this.playBlockSound();
        }

        if (newBlocks.placed)
            this.placedBlocks.add(newBlocks.placed);

        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped);
            var positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: function () { return _this.choppedBlocks.remove(newBlocks.chopped); }}
            var rotateRandomess = 10;
            var rotationParams = {
                delay: 0.05,
                x: newBlocks.place == 'x' ? ((Math.random() * rotateRandomess) - (rotateRandomess / 2)) : 0.1,
                z: newBlocks.place == 'z' ? ((Math.random() * rotateRandomess) - (rotateRandomess / 2)) : 0.1,
                y: Math.random() * 0.1,
            };

            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            } else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }

            TweenLite.to(newBlocks.chopped.position, 1, positionParams);
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
    };

    Game.prototype.addBlock = function () {
        var lastBlock = this.blocks[this.blocks.length -1];
        console.log(lastBlock);
        if (basic == 'y') {
            if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
                return this.endGame();
            }
            this.score = (this.blocks.length -1) >= 0 ? (this.blocks.length -1) : 0 ;
            this.scoreContainer.innerHTML = currentMode + " : " + this.score;
            this.bestScoreContainer.innerHTML = 'Best Score: ' + this.bestScore;
            var newKidOnTheBlock = new Block(lastBlock);
            this.newBlocks.add(newKidOnTheBlock.mesh);
            this.blocks.push(newKidOnTheBlock);
            this.stage.setCamera(this.blocks.length * 2);
            normalBlock = lastBlock;
        } else {
            if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
                lastBlock = normalBlock;
                var newKidOnTheBlock = new Block(lastBlock);
                this.newBlocks.add(newKidOnTheBlock.mesh);
                this.blocks.push(newKidOnTheBlock);
                normalBlock = lastBlock;
            } else {
                return this.endGame();
            }
        }
    };

    Game.prototype.endGame = function () {
        var gameOverPopup = document.getElementById('goPopup');
        gameOverPopup.style.display = 'block';

        var finalScoreElement = document.getElementById('final-score');
        var bestScoreElement = document.getElementById('best-score');
        var rBtnElement = document.getElementById('rBtn');
        var nBtnElement = document.getElementById('nBtn');
        var noticePopup = document.querySelector('.nPopup');

        if (gameOverPopup) {
            if (gameOverPopup.style.display == 'block') {
                if (finalScoreElement) {
                    finalScoreElement.textContent = this.score;
                } else {
                    console.error("Final score display element not found.");
                }
            
                if (bestScoreElement) {
                    bestScoreElement.textContent = 'Best Score: ' + this.bestScore;
                } else {
                    console.error("Best score display element not found.");
                }

                rBtnElement.addEventListener('click', function () {
                    noticePopup.style.display = 'block';
                    gameOverPopup.style.display = 'none';
        
                    document.getElementById('sbtn').addEventListener('click', function () {
                        game.restartGame();
                        noticePopup.style.display = 'none';
                    });
                });
        
                nBtnElement.addEventListener('click', function () {
                    location.reload();
                });
            }
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'q') {
                gameOverPopup.style.display = 'none';
                noticePopup.style.display = 'block';
            }
        });

        this.updateBestScore();
        this.updateScoreDisplay();
        // this.updateState(this.STATES.ENDED);
        this.updateState(this.STATES.ENDSCORE);

        stopBackgroundMusic();
    };

    Game.prototype.tick = function () {
        var _this = this;
        if (this.state === this.STATES.PLAYING) {
            this.blocks[this.blocks.length -1].tick();
        }
        this.stage.render();
        requestAnimationFrame(function () { _this.tick(); });
    };

    Game.prototype.startGameFromPopup = function () {
        var noticePopup = document.querySelector('.nPopup');
        noticePopup.style.display = 'none';
        this.startGame();

        document.getElementById('sbtn').addEventListener('click', function () {
            game.startGameFromPopup();
        });
    };

    Game.prototype.updateScoreDisplay = function () {
        var scoreElement = document.getElementById('score');
        var bestScoreElement = document.getElementById('bestScore');
        if (scoreElement && bestScoreElement) {
            scoreElement.innerHTML = currentMode + ' : ' + this.score;
            bestScoreElement.innerHTML = 'Best Score: ' + this.bestScore;
        } else {
            console.error("Score or Best Score display element not found.");
        }
    };

    Game.prototype.updateBestScoreDisplay = function () {
        var bestScoreElement = document.getElementById('bestScore');
        if (bestScoreElement) {
            bestScoreElement.innerHTML = 'Best Score: ' + this.bestScore;
        } else {
            console.error("Best score display element not found.");
        }
    };

    Game.prototype.updateBestScore = function () {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', String(this.bestScore));
        }
        this.updateBestScoreDisplay();
    };

    return Game;
}());

var game = new Game();