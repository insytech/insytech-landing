/**
 * Semántica de color del producto: verde = Working, ámbar = Idle, rojo =
 * Offline. Estaba duplicada en AndonGridMock y AndonFlowMock; vive aquí porque
 * un cambio de paleta tiene que pasar en los dos a la vez.
 *
 * Estos tres colores no se usan con ningún otro significado en el hero.
 */
export const STATUS = {
    working: {
        label: "Working",
        chip: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
        bar: "bg-green-500",
        dot: "bg-green-500",
    },
    idle: {
        label: "Idle",
        chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
        bar: "bg-amber-500",
        dot: "bg-amber-500",
    },
    offline: {
        label: "Offline",
        chip: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        bar: "bg-red-500",
        dot: "bg-red-500",
    },
} as const;

export type StatusKey = keyof typeof STATUS;

export interface Station {
    name: string;
    status: StatusKey;
    operator: string;
    /** mm:ss del ciclo, o --:-- si la estación no está corriendo. */
    cycle: string;
    done: number;
    total: number;
}
