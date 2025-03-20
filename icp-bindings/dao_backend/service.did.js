const idlFactory = ({ IDL }) => {
  return IDL.Service({
    get_all_submissions: IDL.Func(
      [],
      [
        IDL.Vec(
          IDL.Record({
            data: IDL.Record({
              latitude: IDL.Float64,
              temperature: IDL.Float64,
              city: IDL.Text,
              longitude: IDL.Float64,
              timestamp: IDL.Nat64,
              weather: IDL.Text,
            }),
            user: IDL.Text,
            rewarded: IDL.Bool,
          })
        ),
      ],
      []
    ),
    get_balance: IDL.Func([IDL.Text], [IDL.Nat64], []),
    get_submission: IDL.Func(
      [IDL.Nat64],
      [
        IDL.Variant({
          Ok: IDL.Record({
            data: IDL.Record({
              latitude: IDL.Float64,
              temperature: IDL.Float64,
              city: IDL.Text,
              longitude: IDL.Float64,
              timestamp: IDL.Nat64,
              weather: IDL.Text,
            }),
            user: IDL.Text,
            rewarded: IDL.Bool,
          }),
          Err: IDL.Text,
        }),
      ],
      []
    ),
    reward_user: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
    submit_weather_data: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Float64, IDL.Float64, IDL.Text, IDL.Float64, IDL.Text],
      [IDL.Nat64],
      []
    ),
    vote_on_data: IDL.Func([IDL.Text, IDL.Nat64, IDL.Bool], [IDL.Text], []),
  });
};
const init = ({ IDL }) => {
  /* function body */
};

module.exports = { idlFactory, init };
