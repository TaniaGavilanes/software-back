export interface Ticket {
    documento: string;
    actividad: string;
    estado: string;
    resolucion?: string | null;
    fechaCreacion: Date;
}

export interface GeneralTicket {
    motivo: string;
    estado: string;
    fechaCreacion: Date;
    resoluciones?: string[]| null;
}