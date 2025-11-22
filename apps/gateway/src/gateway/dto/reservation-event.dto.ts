export class ReservationRecordDto {
  id: number;
  reservationId: string;
  createdDate: string;
  fromDate: string;
  toDate: string;
  createdBy: string;
}

export class ReservationCreateEventDto {
  guildId: string;
  reservation: ReservationRecordDto;
}

export class ReservationDeleteEventDto {
  guildId: string;
  reservation: ReservationRecordDto;
}
