import { useEffect, useRef } from "react";

export type GameMode = "flight" | "fighter";
export type GameResult = {
  mode: GameMode;
  score: number;
  coins: number;
  crystals: number;
  distance: number;
  enemies: number;
  win: boolean;
};

type Props = {
  mode: GameMode;
  paused?: boolean;
  onResult: (result: GameResult) => void;
  onBack: () => void;
};

type Spark = { x: number; y: number; life: number; color: string; size: number };
type FlightObstacle = { x: number; y: number; w: number; h: number; kind: "spike" | "orb" | "enemy" | "coin" };

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

const drawShadowHero = (ctx: CanvasRenderingContext2D, x: number, y: number, attacking = false, dodging = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#090a14";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#e7354b";
  ctx.beginPath();
  ctx.ellipse(19, 30, 17, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e7354b";
  ctx.fillRect(10, 10, 6, 3);
  ctx.fillRect(21, 10, 6, 3);
  ctx.fillStyle = "#15162a";
  ctx.beginPath();
  ctx.moveTo(5, 34);
  ctx.lineTo(-15, 48);
  ctx.lineTo(9, 43);
  ctx.lineTo(33, 50);
  ctx.lineTo(30, 37);
  ctx.fill();
  ctx.strokeStyle = attacking ? "#ffb454" : "#8d3eff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (dodging) {
    ctx.arc(19, 30, 31, -0.7, 1.5);
  } else {
    ctx.moveTo(17, 35);
    ctx.lineTo(attacking ? 57 : 40, attacking ? 12 : 41);
  }
  ctx.stroke();
  ctx.restore();
};

const drawBackdrop = (ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#09091a");
  sky.addColorStop(0.65, "#151126");
  sky.addColorStop(1, "#24101d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(231, 53, 75, .16)";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.23, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#261d3e";
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 137 - tick * 0.018) % (w + 170)) - 80;
    const height = 45 + (i % 3) * 24;
    ctx.beginPath();
    ctx.moveTo(x, h - 42);
    ctx.lineTo(x + 32, h - 42 - height);
    ctx.lineTo(x + 68, h - 42);
    ctx.fill();
  }
  ctx.fillStyle = "#0a0a13";
  ctx.fillRect(0, h - 48, w, 48);
  ctx.strokeStyle = "rgba(231,53,75,.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 48);
  ctx.lineTo(w, h - 48);
  ctx.stroke();
};

export function ShadowCanvas({ mode, paused = false, onResult, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef(onResult);
  const backRef = useRef(onBack);
  const pausedRef = useRef(paused);
  resultRef.current = onResult;
  backRef.current = onBack;
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let width = 360;
    let height = 540;
    const keys = new Set<string>();
    const sparks: Spark[] = [];
    let flight = {
      tick: 0, distance: 0, score: 0, coins: 0, defeated: 0, health: 3, speed: 205,
      playerY: 0, velocity: 0, grounded: true, attackUntil: 0, over: false,
      nextSpawn: 230, obstacles: [] as FlightObstacle[],
    };
    let fighter = {
      tick: 0, playerHp: 100, enemyHp: 180, energy: 30, playerX: 70, enemyX: 245,
      actionUntil: 0, action: "", invulnerableUntil: 0, nextEnemyAttack: 1.6, over: false, win: false,
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(420, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const addSparks = (x: number, y: number, color = "#e7354b", count = 6) => {
      for (let i = 0; i < count; i += 1) sparks.push({ x, y, life: 0.45 + Math.random() * 0.35, color, size: 2 + Math.random() * 4 });
    };

    const act = (type: string) => {
      if (mode === "flight") {
        if (type === "jump" && flight.grounded && !flight.over) {
          flight.velocity = -570;
          flight.grounded = false;
          addSparks(90, height - 52, "#8d3eff", 5);
        }
        if (type === "strike" && !flight.over) {
          flight.attackUntil = flight.tick + 0.28;
          addSparks(104, height - 96 + flight.playerY, "#ffb454", 4);
        }
      } else if (!fighter.over) {
        if (type === "quick" || type === "strong") {
          const distance = Math.abs(fighter.playerX - fighter.enemyX);
          if (distance < 145) {
            const damage = type === "strong" ? 30 : 16;
            fighter.enemyHp = Math.max(0, fighter.enemyHp - damage);
            fighter.action = type;
            fighter.actionUntil = fighter.tick + 0.25;
            fighter.energy = Math.min(100, fighter.energy + 7);
            addSparks(fighter.enemyX, height - 120, type === "strong" ? "#ffb454" : "#e7354b", 10);
            if (fighter.enemyHp <= 0) {
              fighter.over = true;
              fighter.win = true;
              addSparks(fighter.enemyX, height - 120, "#b98cff", 24);
            }
          } else {
            fighter.playerX = Math.min(fighter.enemyX - 100, fighter.playerX + 35);
            fighter.action = "step";
            fighter.actionUntil = fighter.tick + 0.16;
          }
        }
        if (type === "ability" && fighter.energy >= 30) {
          fighter.energy -= 30;
          fighter.enemyHp = Math.max(0, fighter.enemyHp - 42);
          fighter.action = "ability";
          fighter.actionUntil = fighter.tick + 0.42;
          addSparks(fighter.enemyX, height - 120, "#8d3eff", 22);
          if (fighter.enemyHp <= 0) { fighter.over = true; fighter.win = true; }
        }
        if (type === "dodge") {
          fighter.invulnerableUntil = fighter.tick + 0.55;
          fighter.playerX = Math.max(35, fighter.playerX - 28);
          fighter.action = "dodge";
          fighter.actionUntil = fighter.tick + 0.38;
        }
        if (type === "jump") {
          fighter.action = "jump";
          fighter.actionUntil = fighter.tick + 0.4;
          fighter.invulnerableUntil = fighter.tick + 0.3;
        }
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (mode === "flight") act(event.button === 2 ? "strike" : "jump");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if (event.key === "Escape") backRef.current();
      if (mode === "flight") {
        if (event.code === "Space" || event.key === "ArrowUp") act("jump");
        if (event.key.toLowerCase() === "x") act("strike");
      } else {
        if (event.key.toLowerCase() === "a") act("quick");
        if (event.key.toLowerCase() === "s") act("strong");
        if (event.key.toLowerCase() === "d") act("dodge");
        if (event.key.toLowerCase() === "q") act("ability");
        if (event.code === "Space") act("jump");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    const flightRect = () => ({ x: 72, y: height - 48 - 48 + flight.playerY, w: 38, h: 56 });
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const updateFlight = (dt: number) => {
      if (flight.over) return;
      flight.tick += dt;
      flight.distance += flight.speed * dt * 0.1;
      flight.score += Math.floor(flight.speed * dt * 0.5);
      flight.speed = Math.min(390, 205 + flight.distance * 0.27);
      flight.velocity += 1580 * dt;
      flight.playerY += flight.velocity * dt;
      if (flight.playerY >= 0) { flight.playerY = 0; flight.velocity = 0; flight.grounded = true; }
      if (flight.distance >= flight.nextSpawn) {
        const roll = Math.random();
        const y = roll < 0.55 ? height - 92 : roll < 0.78 ? height - 178 : height - 255;
        const kind = roll < 0.22 ? "coin" : roll < 0.42 ? "enemy" : roll < 0.68 ? "spike" : "orb";
        flight.obstacles.push({ x: width + 30, y, w: kind === "coin" ? 20 : 34, h: kind === "coin" ? 20 : kind === "orb" ? 30 : 38, kind });
        flight.nextSpawn = flight.distance + 165 + Math.random() * 135;
      }
      const player = flightRect();
      for (const obstacle of flight.obstacles) {
        obstacle.x -= flight.speed * dt;
        const hit = overlap(player, obstacle);
        if (!hit) continue;
        if (obstacle.kind === "coin") {
          flight.coins += 1;
          flight.score += 90;
          obstacle.x = -100;
          addSparks(obstacle.x, obstacle.y, "#ffb454", 5);
        } else if (obstacle.kind === "enemy" && flight.tick < flight.attackUntil) {
          flight.defeated += 1;
          flight.score += 160;
          obstacle.x = -100;
          addSparks(obstacle.x, obstacle.y, "#ffb454", 12);
        } else {
          flight.health -= 1;
          obstacle.x = -100;
          addSparks(player.x, player.y, "#e7354b", 13);
          if (flight.health <= 0) {
            flight.over = true;
            resultRef.current({ mode: "flight", score: flight.score, coins: flight.coins, crystals: 0, distance: Math.floor(flight.distance), enemies: flight.defeated, win: false });
          }
        }
      }
      flight.obstacles = flight.obstacles.filter((item) => item.x > -80);
    };

    const drawFlight = () => {
      drawBackdrop(ctx, width, height, flight.tick * 100);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      for (let i = 0; i < 18; i += 1) {
        const x = (i * 83 - flight.tick * (18 + i)) % width;
        const y = 45 + (i * 37) % (height - 120);
        ctx.fillRect(x < 0 ? x + width : x, y, 2, 2);
      }
      for (const obstacle of flight.obstacles) {
        if (obstacle.kind === "coin") {
          ctx.fillStyle = "#ffb454";
          ctx.shadowColor = "#ffb454";
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(obstacle.x + 10, obstacle.y + 10, 9, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#4b1e28"; ctx.fillRect(obstacle.x + 8, obstacle.y + 4, 4, 12);
        } else if (obstacle.kind === "enemy") {
          ctx.fillStyle = "#5e1e48"; ctx.shadowColor = "#d92d3f"; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(obstacle.x + 17, obstacle.y + 18, 17, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffb454"; ctx.fillRect(obstacle.x + 8, obstacle.y + 15, 18, 3); ctx.shadowBlur = 0;
        } else if (obstacle.kind === "spike") {
          ctx.fillStyle = "#d92d3f"; ctx.beginPath(); ctx.moveTo(obstacle.x, obstacle.y + 38); ctx.lineTo(obstacle.x + 17, obstacle.y); ctx.lineTo(obstacle.x + 34, obstacle.y + 38); ctx.fill();
        } else {
          ctx.fillStyle = "#7540d6"; ctx.shadowColor = "#8d3eff"; ctx.shadowBlur = 14; rounded(ctx, obstacle.x, obstacle.y, 34, 30, 12); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
      drawShadowHero(ctx, 72, height - 48 - 48 + flight.playerY, flight.tick < flight.attackUntil);
      sparks.forEach((spark) => { ctx.globalAlpha = Math.max(0, spark.life * 2); ctx.fillStyle = spark.color; ctx.fillRect(spark.x, spark.y, spark.size, spark.size); ctx.globalAlpha = 1; });
      ctx.fillStyle = "#f7f2ff"; ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(`DISTÂNCIA ${Math.floor(flight.distance)}m`, 18, 28);
      ctx.fillText(`✦ ${flight.coins}`, width - 68, 28);
      ctx.fillStyle = "#e7354b"; ctx.fillText("◆".repeat(flight.health) + "◇".repeat(3 - flight.health), 18, 50);
      ctx.fillStyle = "#ffb454"; ctx.fillText(`${flight.score.toLocaleString("pt-BR")} PTS`, width - 100, 50);
      if (flight.over) { ctx.fillStyle = "rgba(4,4,10,.48)"; ctx.fillRect(0, 0, width, height); }
    };

    const updateFighter = (dt: number) => {
      if (fighter.over) return;
      fighter.tick += dt;
      if (fighter.tick > fighter.nextEnemyAttack) {
        fighter.nextEnemyAttack = fighter.tick + 1.4 + Math.random() * 1.4;
        if (fighter.tick > fighter.invulnerableUntil) {
          fighter.playerHp = Math.max(0, fighter.playerHp - (fighter.enemyHp < 80 ? 18 : 12));
          addSparks(fighter.playerX + 20, height - 113, "#e7354b", 8);
          if (fighter.playerHp <= 0) {
            fighter.over = true;
            resultRef.current({ mode: "fighter", score: 0, coins: 20, crystals: 0, distance: 0, enemies: 1, win: false });
          }
        }
      }
    };

    const drawFighter = () => {
      drawBackdrop(ctx, width, height, fighter.tick * 40);
      const arenaY = height - 78;
      ctx.fillStyle = "#301528"; ctx.fillRect(0, arenaY, width, 30);
      ctx.strokeStyle = "rgba(141,62,255,.5)"; ctx.beginPath(); ctx.moveTo(0, arenaY); ctx.lineTo(width, arenaY); ctx.stroke();
      ctx.fillStyle = "#f7f2ff"; ctx.font = "700 12px Inter, sans-serif"; ctx.fillText("SENTINELA DO VAZIO", width - 150, 29);
      ctx.fillStyle = "#32131c"; rounded(ctx, width - 160, 38, 140, 9, 4); ctx.fill(); ctx.fillStyle = "#e7354b"; rounded(ctx, width - 160, 38, 140 * (fighter.enemyHp / 180), 9, 4); ctx.fill();
      ctx.fillStyle = "#32131c"; rounded(ctx, 20, 38, 140, 9, 4); ctx.fill(); ctx.fillStyle = "#56d5ff"; rounded(ctx, 20, 38, 140 * (fighter.playerHp / 100), 9, 4); ctx.fill();
      ctx.fillStyle = "#f7f2ff"; ctx.fillText("VOCÊ", 20, 29);
      ctx.fillStyle = "#8d3eff"; ctx.shadowColor = "#8d3eff"; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(fighter.enemyX + 20, arenaY - 62, 37, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#100b1e"; ctx.beginPath(); ctx.moveTo(fighter.enemyX - 5, arenaY - 36); ctx.lineTo(fighter.enemyX + 16, arenaY - 102); ctx.lineTo(fighter.enemyX + 44, arenaY - 36); ctx.fill();
      drawShadowHero(ctx, fighter.playerX, arenaY - 94, fighter.action === "quick" || fighter.action === "strong" || fighter.action === "ability", fighter.action === "dodge");
      ctx.fillStyle = "#ffb454"; ctx.font = "700 12px Inter, sans-serif"; ctx.fillText(`ENERGIA ${Math.floor(fighter.energy)}%`, 20, height - 25);
      ctx.fillStyle = "#2b1c42"; rounded(ctx, 94, height - 34, 110, 8, 4); ctx.fill(); ctx.fillStyle = "#ffb454"; rounded(ctx, 94, height - 34, 110 * (fighter.energy / 100), 8, 4); ctx.fill();
      if (fighter.over) { ctx.fillStyle = "rgba(4,4,10,.55)"; ctx.fillRect(0, 0, width, height); }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.035);
      last = now;
      if (!pausedRef.current) {
        if (mode === "flight") updateFlight(dt);
        else updateFighter(dt);
        for (let i = sparks.length - 1; i >= 0; i -= 1) { sparks[i].life -= dt; sparks[i].x -= 22 * dt; sparks[i].y -= 18 * dt; if (sparks[i].life <= 0) sparks.splice(i, 1); }
      }
      if (mode === "flight") drawFlight();
      else drawFighter();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label={mode === "flight" ? "Shadow Flight" : "Shadow Fighter"} />;
}

export function CanvasActionButton({ label, icon, onClick, tone = "red", disabled = false }: { label: string; icon: string; onClick: () => void; tone?: "red" | "violet" | "gold" | "blue"; disabled?: boolean }) {
  return <button type="button" disabled={disabled} className={`game-action action-${tone}`} onClick={onClick}><span className="action-icon">{icon}</span><span>{label}</span></button>;
}
