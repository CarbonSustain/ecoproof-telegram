import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'get_all_submissions' : ActorMethod<
    [],
    Array<
      {
        'data' : {
          'latitude' : number,
          'temperature' : number,
          'city' : string,
          'longitude' : number,
          'timestamp' : bigint,
          'weather' : string,
        },
        'user' : string,
        'rewarded' : boolean,
      }
    >
  >,
  'get_balance' : ActorMethod<[string], bigint>,
  'get_submission' : ActorMethod<
    [bigint],
    {
        'Ok' : {
          'data' : {
            'latitude' : number,
            'temperature' : number,
            'city' : string,
            'longitude' : number,
            'timestamp' : bigint,
            'weather' : string,
          },
          'user' : string,
          'rewarded' : boolean,
        }
      } |
      { 'Err' : string }
  >,
  'reward_user' : ActorMethod<
    [bigint, string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'submit_weather_data' : ActorMethod<
    [string, string, number, number, string, number, string],
    bigint
  >,
  'vote_on_data' : ActorMethod<[string, bigint, boolean], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
