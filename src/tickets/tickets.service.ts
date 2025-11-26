import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MssqlService } from '@strongnguyen/nestjs-mssql';
import { DynamicDatabaseService } from '../database/dynamic-database.service';
import { ActivitiesService } from '../activities/activities.service';
import { Ticket, GeneralTicket } from './interfaces/tickets.interfaces';
import { FilesService } from 'src/files/files.service';


@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly mssql: MssqlService,
    private readonly dynamicDb: DynamicDatabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly filesService: FilesService,
  ) {}

  // Crear ticket individual
  async createTicket(data: {
    motivo: string;
    claveProfesor: string;
    claveDepartamento: string;
    claveDocumento: string;
  }): Promise<Ticket> {
    try {
      this.logger.log('Creando ticket en la base de datos');

      const fechaCreacion = new Date();
      const clave = `${data.claveProfesor}-${fechaCreacion}`;

      const pool = await this.mssql.getPool();
      const result = await pool
        .request()
        .input('ClaveTicket', clave)
        .input('FechaCreacion', fechaCreacion)
        .input('Motivo', data.motivo)
        .input('ClaveDocente', data.claveProfesor)
        .input('ClaveDepartamento', data.claveDepartamento)
        .input('ClaveDocumento', data.claveDocumento)
        .input('Estado', 'PENDIENTE')
        .query(`
          INSERT INTO Ticket (ClaveTicket, FechaCreacion, Motivo, ClaveDocente, ClaveDepartamento, ClaveDocumento, Estado)
          VALUES (@ClaveTicket, @FechaCreacion, @Motivo, @ClaveDocente, @ClaveDepartamento, @ClaveDocumento, @Estado);
        `);

      const ticket = await this.getTicketShownData(clave);

      return ticket;

      
    } catch (error) {
      this.logger.error(`Error en createTicket: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTicketShownData(claveTicket: string): Promise<Ticket> {
    const pool = await this.mssql.getPool();

    const data = await pool
      .request()
      .input('ClaveTicket', claveTicket)
      .query(`
        SELECT 
          d.Nombre as documento,      
          a.Nombre as actividad,
          t.Estado as estado,
          t.FechaCreacion as fechaCreacion
        FROM Ticket t
        INNER JOIN Actividad_Documento ad ON t.ClaveDocumento = ad.ClaveDocumento
        INNER JOIN Actividad a ON ad.ClaveActividad = a.ClaveActividad
        INNER JOIN Documento d ON t.ClaveDocumento = d.ClaveDocumento
        WHERE ClaveTicket = @ClaveTicket;
      `);

    return {
        documento: data.recordset[0]?.documento,
        actividad: data.recordset[0]?.actividad,
        estado: data.recordset[0]?.estado,
        fechaCreacion: data.recordset[0]?.fechaCreacion,
      };
  }

  // Obtener ticket por claveTicketGeneral
  async getTicket(claveTicketGeneral: string): Promise<GeneralTicket> {
    try {
      this.logger.log(`Buscando tickets con ClaveTicketGeneral: ${claveTicketGeneral}`);
      
      const pool = await this.mssql.getPool();
      const data = await pool
        .request()
        .input('ClaveTicketGeneral', claveTicketGeneral)
        .query(`
          SELECT 
            Motivo as motivo,
            Estado as estado,
            FechaCreacion as fechaCreacion, 
            Resolucion as resolucion
          FROM TicketGeneral
          WHERE ClaveTicketGeneral = @ClaveTicketGeneral;
        `);

      const resolutions = await this.getGeneralTicketResolutions(claveTicketGeneral);

      return {
        motivo: data.recordset[0]?.motivo,
        estado: data.recordset[0]?.estado,
        fechaCreacion: data.recordset[0]?.fechaCreacion,
        resoluciones: resolutions,
      }
      
    } catch (error) {
      this.logger.error(`Error en getTicket: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Actualizar ticket (agregar resolución)
  async updateTicket(claveTicket: string, resolucion: string): Promise<Ticket> {
    try {
      this.logger.log(`Actualizando resolución del ticket: ${claveTicket}`);
      
      const pool = await this.mssql.getPool();
      await pool
        .request()
        .input('ClaveTicket', claveTicket)
        .input('Resolucion', resolucion)
        .input('Estado', 'RESUELTO')
        .query(`
          UPDATE Ticket
          SET Resolucion = @Resolucion,
              Estado = @Estado
          WHERE ClaveTicket = @ClaveTicket;
        `);

      const ticket = await this.getTicketShownData(claveTicket);

      return ticket;

    } catch (error) {
      this.logger.error(`Error en updateTicket: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Crear ticket general
  async createGeneralTicket(data: {
    motivo: string;
    claveProfesor: string;
  }): Promise<GeneralTicket> {
    try {
      this.logger.log('Creando ticket general en la base de datos');
      
      const fechaCreacion = new Date();
      const clave = `${data.claveProfesor}-${fechaCreacion}`;

      const pool = await this.mssql.getPool();
      await pool
        .request()
        .input('ClaveTicketGeneral', clave)
        .input('FechaCreacion', fechaCreacion)
        .input('Motivo', data.motivo)
        .input('Estado', 'PENDIENTE')
        .input('ClaveDocente', data.claveProfesor)
        .query(`
          INSERT INTO TicketGeneral (ClaveTicketGeneral, FechaCreacion, Motivo, Estado, ClaveDocente)
          VALUES (@ClaveTicketGeneral, @FechaCreacion, @Motivo, @Estado, @ClaveDocente);
        `);

      const ticketGeneral = await this.getTicket(clave);

      return ticketGeneral;
      
    } catch (error) {
      this.logger.error(`Error en createGeneralTicket: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Obtener resoluciones de un ticket general
  async getGeneralTicketResolutions(claveTicketGeneral: string): Promise<string[] | null> {
    try {
      this.logger.log(`Buscando resoluciones del ticket general: ${claveTicketGeneral}`);

      const pool = await this.mssql.getPool();
      const resolutions = await pool
        .request()
        .input('ClaveTicketGeneral', claveTicketGeneral)
        .query(`
          SELECT 
            Resolucion as resolucion
          FROM TicketGeneral tg
          INNER JOIN TicketGeneral_Departamento tgd ON tg.ClaveTicketGeneral = tgd.ClaveTicketGeneral
          WHERE tg.ClaveTicketGeneral = @ClaveTicketGeneral;
        `)

      return resolutions.recordset.map(r => r.resolucion) || null;
  
    } catch (error) {
      this.logger.error(`Error en getGeneralTicketResolutions: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Actualizar ticket general
  async updateGeneralTicket(
    claveTicketGeneral: string, 
    resolucion: string, 
    claveDepartamento: string
  ): Promise<GeneralTicket> {
    try {
      this.logger.log(`Actualizando ticket general: ${claveTicketGeneral} para departamento: ${claveDepartamento}`);
      
      const pool = await this.mssql.getPool();
      await pool
        .request()
        .input('ClaveTicketGeneral', claveTicketGeneral)
        .input('Resolucion', resolucion)
        .input('ClaveDepartamento', claveDepartamento)
        .query(`
          INSERT INTO TicketGeneral_Departamento (ClaveTicketGeneral, ClaveDepartamento, Resolucion)
          VALUES (@ClaveTicketGeneral, @ClaveDepartamento, @Resolucion);
        `);

      const ticketGeneral = await this.getTicket(claveTicketGeneral);

      return ticketGeneral;

    } catch (error) {
      this.logger.error(`Error en updateGeneralTicket: ${error.message}`, error.stack);
      throw error;
    }
  }
}